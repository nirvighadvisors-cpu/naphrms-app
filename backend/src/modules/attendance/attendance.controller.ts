import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../../config/database';
import { calculateDistance } from '../../utils/geo.utils';
import { processCompOffForAttendance } from './attendance.service';
import { notifyUsers, getHRAdminUserIds } from '../../services/notification.service';
import {
  punchInSchema,
  punchOutSchema,
  markAttendanceSchema,
  regularizationCreateSchema,
  regularizationReviewSchema,
  dateRangeQuerySchema,
} from './attendance.validation';
import { uploadFile, getSignedUrl } from '../../lib/storage';

// ── Helpers ──────────────────────────────────────────────────

/** Returns start-of-day Date for "today" in IST (date-only, no time component). */
const getTodayDate = (): Date => {
  const dateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  return new Date(`${dateStr}T00:00:00.000Z`);
};

/** Helper to get week-off days for a specific date from history */
const getWeekOffDaysForDate = (employee: any, date: Date): string[] => {
  const defaultWeekOffs = employee.weekOffDays || ['SUNDAY'];
  if (!employee.weekOffHistory) return defaultWeekOffs;
  
  try {
    const history = typeof employee.weekOffHistory === 'string' 
      ? JSON.parse(employee.weekOffHistory) 
      : employee.weekOffHistory;
      
    if (!Array.isArray(history) || history.length === 0) return defaultWeekOffs;
    
    const sortedHistory = [...history].sort((a, b) => 
      new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime()
    );
    
    const targetTime = date.getTime();
    for (const record of sortedHistory) {
      if (targetTime >= new Date(record.effectiveFrom).getTime()) {
        return record.weekOffDays || defaultWeekOffs;
      }
    }
    
    return sortedHistory[sortedHistory.length - 1].weekOffDays || defaultWeekOffs;
  } catch (e) {
    return defaultWeekOffs;
  }
};

/**
 * Fetches the office start time (HH:MM, 24h IST) from SystemSetting.
 * Falls back to '10:30' if not configured.
 */
const getShiftStartTime = async (): Promise<{ hours: number; minutes: number }> => {
  const setting = await prisma.systemSetting.findUnique({ where: { key: 'SHIFT_START_TIME' } });
  const value = setting?.value || '10:30'; // Default: 10:30 AM IST
  const [h, m] = value.split(':').map(Number);
  return { hours: h, minutes: m };
};

/**
 * Checks if the given timestamp is after the admin-configured shift start time.
 * Compares in IST (UTC+5:30).
 */
const isLateArrival = async (punchTime: Date): Promise<boolean> => {
  const shift = await getShiftStartTime();
  // Convert the punch time to IST hours & minutes
  const istOffsetMs = 5.5 * 60 * 60 * 1000; // +5:30
  const istTime = new Date(punchTime.getTime() + istOffsetMs);
  const punchHours = istTime.getUTCHours();
  const punchMinutes = istTime.getUTCMinutes();
  // Late if punch time is strictly after shift start
  return punchHours > shift.hours || (punchHours === shift.hours && punchMinutes > shift.minutes);
};

// ── POST /api/attendance/punch-in ────────────────────────────
export const punchIn = async (req: Request, res: Response): Promise<void> => {
  const parsed = punchInSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  const { lat, lng, workSiteId: bodyWorkSiteId, photoBase64 } = parsed.data;

  // Resolve employee from authenticated user
  const employee = await prisma.employee.findUnique({ where: { userId: req.user!.userId } });
  if (!employee) {
    res.status(404).json({ error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee profile not found' } });
    return;
  }

  const today = getTodayDate();

  // Check if already punched in today (record exists with no punchOutTime)
  const existing = await prisma.attendanceRecord.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: today } },
  });

  if (existing && !existing.punchOutTime) {
    res.status(400).json({ error: { code: 'ALREADY_PUNCHED_IN', message: 'You have already punched in today. Please punch out first.' } });
    return;
  }

  if (existing && existing.punchOutTime) {
    res.status(400).json({ error: { code: 'ALREADY_COMPLETED', message: 'Attendance for today is already complete.' } });
    return;
  }

  // Determine the work site to validate against
  const effectiveWorkSiteId = bodyWorkSiteId || employee.workSiteId;

  // Geofencing check
  if (effectiveWorkSiteId && lat !== undefined && lng !== undefined) {
    const workSite = await prisma.workSite.findUnique({ where: { id: effectiveWorkSiteId } });
    if (workSite && workSite.latitude !== null && workSite.longitude !== null) {
      const distance = calculateDistance(lat, lng, workSite.latitude, workSite.longitude);
      const radius = workSite.radius ?? 200;
      if (distance > radius) {
        res.status(403).json({
          error: {
            code: 'OUTSIDE_GEOFENCE',
            message: `You are ${Math.round(distance)}m away from the work site. Maximum allowed: ${radius}m.`,
          },
        });
        return;
      }
    }
  }

  // Handle Photo Base64
  const match = photoBase64.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
  if (!match) {
    res.status(400).json({ error: { code: 'INVALID_IMAGE', message: 'Invalid base64 image data for live photo' } });
    return;
  }
  const mimeType = `image/${match[1]}`;
  const base64Data = match[2];
  const buffer = Buffer.from(base64Data, 'base64');
  const fileName = `punch-in-${employee.id}-${Date.now()}.${match[1]}`;
  const photoPath = await uploadFile('attendance-photos', fileName, buffer, mimeType);

  const now = new Date();
  const hasGps = lat !== undefined && lng !== undefined;
  const status = (await isLateArrival(now)) ? 'LATE' : 'PRESENT';
  const source = hasGps ? 'GPS_VERIFIED' : 'WEB';

  // Default auto-punch-out at 10:30 PM IST = 17:00 UTC
  const autoPunchOutTime = new Date(today);
  autoPunchOutTime.setUTCHours(17, 0, 0, 0);

  const record = await prisma.attendanceRecord.create({
    data: {
      employeeId: employee.id,
      date: today,
      punchInTime: now,
      punchInLat: lat ?? null,
      punchInLng: lng ?? null,
      workSiteId: effectiveWorkSiteId ?? null,
      source,
      status,
      autoPunchOutTime,
      punchInPhotoPath: photoPath,
    },
  });

  res.status(201).json({ data: record });
};

// ── POST /api/attendance/punch-out ───────────────────────────
export const punchOut = async (req: Request, res: Response): Promise<void> => {
  const parsed = punchOutSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  const { lat, lng, photoBase64 } = parsed.data;

  const employee = await prisma.employee.findUnique({ where: { userId: req.user!.userId } });
  if (!employee) {
    res.status(404).json({ error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee profile not found' } });
    return;
  }

  const today = getTodayDate();

  const record = await prisma.attendanceRecord.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: today } },
  });

  if (!record) {
    res.status(400).json({ error: { code: 'NO_PUNCH_IN', message: 'No punch-in record found for today. Please punch in first.' } });
    return;
  }

  if (record.punchOutTime) {
    res.status(400).json({ error: { code: 'ALREADY_PUNCHED_OUT', message: 'You have already punched out today.' } });
    return;
  }

  const now = new Date();
  const punchInTime = record.punchInTime!;
  const workHours = parseFloat(((now.getTime() - punchInTime.getTime()) / (1000 * 60 * 60)).toFixed(2));

  // Handle Photo Base64
  const match = photoBase64.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
  if (!match) {
    res.status(400).json({ error: { code: 'INVALID_IMAGE', message: 'Invalid base64 image data for live photo' } });
    return;
  }
  const mimeType = `image/${match[1]}`;
  const base64Data = match[2];
  const buffer = Buffer.from(base64Data, 'base64');
  const fileName = `punch-out-${employee.id}-${Date.now()}.${match[1]}`;
  const photoPath = await uploadFile('attendance-photos', fileName, buffer, mimeType);

  const updated = await prisma.attendanceRecord.update({
    where: { id: record.id },
    data: {
      punchOutTime: now,
      punchOutLat: lat ?? null,
      punchOutLng: lng ?? null,
      workHours,
      punchOutPhotoPath: photoPath,
    },
  });

  processCompOffForAttendance(record.id).catch(err => console.error(err));

  res.json({ data: updated });
};

// ── POST /api/attendance/extend ─────────────────────────────
export const extendPunchOut = async (req: Request, res: Response): Promise<void> => {
  const { extensionMinutes } = req.body;

  // Only allow 30 or 60 minutes extension
  if (![30, 60].includes(extensionMinutes)) {
    res.status(400).json({ error: { code: 'INVALID_EXTENSION', message: 'Extension must be 30 or 60 minutes.' } });
    return;
  }

  const employee = await prisma.employee.findUnique({ where: { userId: req.user!.userId } });
  if (!employee) {
    res.status(404).json({ error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee profile not found' } });
    return;
  }

  const today = getTodayDate();

  const record = await prisma.attendanceRecord.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: today } },
  });

  if (!record || record.punchOutTime) {
    res.status(400).json({ error: { code: 'NO_ACTIVE_SESSION', message: 'No active punch-in session found.' } });
    return;
  }

  // Calculate new deadline from current deadline (or default 10:30 PM IST)
  const currentDeadline = record.autoPunchOutTime || new Date(today.getTime());
  if (!record.autoPunchOutTime) {
    currentDeadline.setUTCHours(17, 0, 0, 0); // 10:30 PM IST = 17:00 UTC
  }

  const newDeadline = new Date(currentDeadline.getTime() + extensionMinutes * 60 * 1000);

  // Maximum extension: 11:30 PM IST = 18:00 UTC
  const maxDeadline = new Date(today);
  maxDeadline.setUTCHours(18, 0, 0, 0);

  if (newDeadline > maxDeadline) {
    res.status(400).json({ error: { code: 'MAX_EXTENSION_REACHED', message: 'Cannot extend beyond 11:30 PM IST.' } });
    return;
  }

  const updated = await prisma.attendanceRecord.update({
    where: { id: record.id },
    data: { autoPunchOutTime: newDeadline },
  });

  // Notify the employee that their extension was confirmed
  const deadlineIST = newDeadline.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });

  await prisma.notification.create({
    data: {
      userId: req.user!.userId,
      title: '⏱️ Time Extended',
      message: `Your auto punch-out has been extended by ${extensionMinutes} minutes. New deadline: ${deadlineIST} IST.`,
      type: 'INFO' as any,
      isRead: false,
      linkUrl: '/employee/attendance',
    },
  });

  res.json({ data: updated, message: `Punch-out extended to ${deadlineIST} IST.` });
};

// ── GET /api/attendance/today ────────────────────────────────
export const getToday = async (req: Request, res: Response): Promise<void> => {
  const employee = await prisma.employee.findUnique({ where: { userId: req.user!.userId } });
  if (!employee) {
    res.status(404).json({ error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee profile not found' } });
    return;
  }

  const today = getTodayDate();

  const record = await prisma.attendanceRecord.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: today } },
    include: { workSite: { select: { name: true } } },
  });

  res.json({ data: record });
};

// ── GET /api/attendance/my ───────────────────────────────────
export const getMyAttendance = async (req: Request, res: Response): Promise<void> => {
  const queryParsed = dateRangeQuerySchema.safeParse(req.query);
  if (!queryParsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid query', details: queryParsed.error.flatten() } });
    return;
  }

  const employee = await prisma.employee.findUnique({ where: { userId: req.user!.userId } });
  if (!employee) {
    res.status(404).json({ error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee profile not found' } });
    return;
  }

  const { startDate, endDate, page = 1, limit = 20 } = queryParsed.data;
  const skip = (page - 1) * limit;

  const where: Prisma.AttendanceRecordWhereInput = {
    employeeId: employee.id,
    ...(startDate || endDate
      ? {
          date: {
            ...(startDate ? { gte: new Date(startDate) } : {}),
            ...(endDate ? { lte: new Date(endDate) } : {}),
          },
        }
      : {}),
  };

  const [records, total] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where,
      skip,
      take: limit,
      include: { 
        workSite: { select: { name: true } },
        regularizationReq: true,
      },
      orderBy: { date: 'desc' },
    }),
    prisma.attendanceRecord.count({ where }),
  ]);

  // Monthly summary: group counts for the specified month (or current month if not provided)
  const now = new Date();
  const summaryStart = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
  const summaryEnd = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [monthlyCounts, hoursAgg] = await Promise.all([
    prisma.attendanceRecord.groupBy({
      by: ['status'],
      where: {
        employeeId: employee.id,
        date: { gte: summaryStart, lte: summaryEnd },
      },
      _count: { id: true },
    }),
    prisma.attendanceRecord.aggregate({
      where: {
        employeeId: employee.id,
        date: { gte: summaryStart, lte: summaryEnd },
      },
      _sum: { workHours: true },
    })
  ]);

  const rawSummary = monthlyCounts.reduce(
    (acc, item) => {
      acc[item.status] = item._count.id;
      return acc;
    },
    {} as Record<string, number>
  );

  // Calculate synthetic week offs
  let syntheticWeekEndsCount = 0;
  let syntheticRecords: any[] = [];
  const existingDates = new Set(records.map(r => r.date.toISOString().split('T')[0]));
  
  if (startDate && endDate) {
    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const sDate = new Date(startDate);
    const eDate = new Date(endDate);
    
    for (let d = new Date(sDate); d <= eDate; d.setDate(d.getDate() + 1)) {
      const dayName = dayNames[d.getDay()];
      const dateStr = d.toISOString().split('T')[0];
      const weekOffDays = getWeekOffDaysForDate(employee, d);
      
      if (weekOffDays.includes(dayName)) {
        // If they already have an attendance record (e.g. they worked on a weekend), do not overwrite it.
        // Also increment summary counts for weekends.
        if (d >= summaryStart && d <= summaryEnd && !existingDates.has(dateStr)) {
          syntheticWeekEndsCount++;
        }
        
        if (!existingDates.has(dateStr)) {
          syntheticRecords.push({
            id: `synthetic-${dateStr}`,
            employeeId: employee.id,
            date: new Date(d),
            status: 'WEEKEND',
            punchInTime: null,
            punchOutTime: null,
            workHours: 0,
            location: null,
            punchInPhotoPath: null,
            punchOutPhotoPath: null,
            punchInPhotoUrl: null,
            punchOutPhotoUrl: null,
            workSite: null,
            regularizationReq: null,
            createdAt: new Date(d),
            updatedAt: new Date(d)
          });
        }
      }
    }
  }

  const summary = {
    present: rawSummary['PRESENT'] || 0,
    absent: rawSummary['ABSENT'] || 0,
    late: rawSummary['LATE'] || 0,
    halfDay: rawSummary['HALF_DAY'] || 0,
    wfh: rawSummary['WFH'] || 0,
    onLeave: rawSummary['ON_LEAVE'] || 0,
    weekend: (rawSummary['WEEKEND'] || 0) + syntheticWeekEndsCount,
    totalHours: hoursAgg._sum.workHours || 0,
  };

  const recordsWithUrls = await Promise.all(records.map(async (record) => {
    return {
      ...record,
      punchInPhotoUrl: record.punchInPhotoPath ? await getSignedUrl(record.punchInPhotoPath) : null,
      punchOutPhotoUrl: record.punchOutPhotoPath ? await getSignedUrl(record.punchOutPhotoPath) : null,
    };
  }));
  
  // Combine real and synthetic records, then sort by date desc
  const allRecords = [...recordsWithUrls, ...syntheticRecords].sort((a, b) => b.date.getTime() - a.date.getTime());

  res.json({
    data: allRecords,
    pagination: {
      total: total + syntheticRecords.length,
      page,
      limit,
      totalPages: Math.ceil((total + syntheticRecords.length) / limit),
    },
    summary,
  });
};

// ── GET /api/attendance (admin) ──────────────────────────────
export const getAllAttendance = async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const employeeId = req.query.employeeId as string;
  const departmentId = req.query.departmentId as string;
  const dateStr = req.query.date as string;
  const startDate = req.query.startDate as string;
  const endDate = req.query.endDate as string;
  const status = req.query.status as string;

  const where: Prisma.AttendanceRecordWhereInput = {
    ...(employeeId ? { employeeId } : {}),
    ...(departmentId ? { employee: { departmentId } } : {}),
    ...(status ? { status: status as any } : {}),
  };

  // Date filtering
  if (dateStr) {
    where.date = new Date(dateStr);
  } else if (startDate || endDate) {
    where.date = {
      ...(startDate ? { gte: new Date(startDate) } : {}),
      ...(endDate ? { lte: new Date(endDate) } : {}),
    };
  }

  const [records, total] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where,
      skip,
      take: limit,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            department: { select: { name: true } },
          },
        },
        workSite: { select: { name: true } },
        regularizationReq: true,
      },
      orderBy: { date: 'desc' },
    }),
    prisma.attendanceRecord.count({ where }),
  ]);

  const recordsWithUrls = await Promise.all(records.map(async (record) => {
    return {
      ...record,
      punchInPhotoUrl: record.punchInPhotoPath ? await getSignedUrl(record.punchInPhotoPath) : null,
      punchOutPhotoUrl: record.punchOutPhotoPath ? await getSignedUrl(record.punchOutPhotoPath) : null,
    };
  }));

  let syntheticRecords: any[] = [];
  if (employeeId && startDate && endDate && !status) {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true, weekOffDays: true, weekOffHistory: true } });
    if (employee) {
      const existingDates = new Set(records.map(r => r.date.toISOString().split('T')[0]));
      const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
      const sDate = new Date(startDate);
      const eDate = new Date(endDate);
      
      for (let d = new Date(sDate); d <= eDate; d.setDate(d.getDate() + 1)) {
        const dayName = dayNames[d.getDay()];
        const dateStr = d.toISOString().split('T')[0];
        const weekOffDays = getWeekOffDaysForDate(employee, d);
        
        if (weekOffDays.includes(dayName) && !existingDates.has(dateStr)) {
          syntheticRecords.push({
            id: `synthetic-${dateStr}`,
            employeeId: employee.id,
            date: new Date(d),
            status: 'WEEKEND',
            punchInTime: null,
            punchOutTime: null,
            workHours: 0,
            location: null,
            punchInPhotoPath: null,
            punchOutPhotoPath: null,
            punchInPhotoUrl: null,
            punchOutPhotoUrl: null,
            workSite: null,
            regularizationReq: null,
            createdAt: new Date(d),
            updatedAt: new Date(d)
          });
        }
      }
    }
  }

  const allRecords = [...recordsWithUrls, ...syntheticRecords].sort((a, b) => b.date.getTime() - a.date.getTime());

  res.json({
    data: allRecords,
    pagination: {
      total: total + syntheticRecords.length,
      page,
      limit,
      totalPages: Math.ceil((total + syntheticRecords.length) / limit),
    },
  });
};

// ── GET /api/attendance/summary (admin) ──────────────────────
export const getAttendanceSummary = async (req: Request, res: Response): Promise<void> => {
  const dateParam = req.query.date as string;
  const targetDate = dateParam ? new Date(dateParam) : getTodayDate();
  
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [
    totalEmployees,
    todayRecords,
    todayStatusCounts,
    monthlyStatusCounts,
    avgWorkHoursResult,
  ] = await Promise.all([
    prisma.employee.count({ where: { status: 'ACTIVE' } }),
    prisma.attendanceRecord.count({ where: { date: targetDate } }),
    prisma.attendanceRecord.groupBy({
      by: ['status'],
      where: { date: targetDate },
      _count: { id: true },
    }),
    prisma.attendanceRecord.groupBy({
      by: ['status'],
      where: { date: { gte: monthStart, lte: monthEnd } },
      _count: { id: true },
    }),
    prisma.attendanceRecord.aggregate({
      where: { date: targetDate, workHours: { not: null } },
      _avg: { workHours: true },
    }),
  ]);

  const todayStats = todayStatusCounts.reduce(
    (acc, item) => {
      acc[item.status] = item._count.id;
      return acc;
    },
    {} as Record<string, number>
  );

  const monthlyStats = monthlyStatusCounts.reduce(
    (acc, item) => {
      acc[item.status] = item._count.id;
      return acc;
    },
    {} as Record<string, number>
  );

  // Calculate synthetic weekends for active employees for the month
  let syntheticMonthlyWeekends = 0;
  const activeEmployeesList = await prisma.employee.findMany({ where: { status: 'ACTIVE' }, select: { weekOffDays: true, weekOffHistory: true } });
  
  const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
    const dayName = dayNames[d.getDay()];
    for (const emp of activeEmployeesList) {
      const wDays = getWeekOffDaysForDate(emp, d);
      if (wDays.includes(dayName)) {
        syntheticMonthlyWeekends++;
      }
    }
  }

  // To prevent double counting if there are existing WEEKEND records in the DB
  const existingWeekends = monthlyStats['WEEKEND'] || 0;
  monthlyStats['WEEKEND'] = existingWeekends + syntheticMonthlyWeekends;

  res.json({
    data: {
      totalEmployees,
      presentToday: todayStats['PRESENT'] || 0,
      absentToday: totalEmployees - todayRecords,
      lateToday: todayStats['LATE'] || 0,
      wfhToday: todayStats['WFH'] || 0,
      avgWorkHours: parseFloat((avgWorkHoursResult._avg.workHours ?? 0).toFixed(2)),
      monthlyStats,
    }
  });
};

// ── GET /api/attendance/analytics ──────────────────────────────
export const getAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = req.user?.role;
    const employeeId = req.query.employeeId as string | undefined;
    
    // Default to last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    if (role === 'EMPLOYEE' || employeeId) {
      // Employee Analytics: Hours over time & heatmap
      const targetEmployeeId = role === 'EMPLOYEE' ? req.user!.employeeId : employeeId;
      
      const records = await prisma.attendanceRecord.findMany({
        where: {
          employeeId: targetEmployeeId,
          date: { gte: startDate, lte: endDate }
        },
        orderBy: { date: 'asc' },
        select: { date: true, workHours: true, status: true }
      });
      
      // Group for hours chart
      const hoursData = records.map(r => ({
        date: r.date.toISOString().split('T')[0],
        hours: r.workHours || 0
      }));
      
      res.json({ data: { hoursData, heatmapData: records } });
    } else {
      // Admin Analytics: Department-wise averages
      const departments = await prisma.department.findMany({
        select: {
          id: true,
          name: true,
          employees: {
            select: { id: true }
          }
        }
      });
      
      const depStats = await Promise.all(departments.map(async (dep) => {
        const empIds = dep.employees.map(e => e.id);
        const agg = await prisma.attendanceRecord.aggregate({
          where: {
            employeeId: { in: empIds },
            date: { gte: startDate, lte: endDate }
          },
          _avg: { workHours: true }
        });
        
        return {
          department: dep.name,
          avgHours: agg._avg.workHours || 0
        };
      }));
      
      res.json({ data: depStats });
    }
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch analytics' } });
  }
};

// ── POST /api/attendance/mark (admin) ────────────────────────
export const markAttendance = async (req: Request, res: Response): Promise<void> => {
  const parsed = markAttendanceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  const { employeeId, date, status } = parsed.data;

  // Verify employee exists
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' } });
    return;
  }

  const dateObj = new Date(new Date(date).toISOString().split('T')[0]);

  const record = await prisma.attendanceRecord.upsert({
    where: { employeeId_date: { employeeId, date: dateObj } },
    create: {
      employeeId,
      date: dateObj,
      status,
      source: 'WEB',
    },
    update: {
      status,
    },
  });

  res.json({ data: record });
};

// ── POST /api/attendance/regularize ──────────────────────────
export const createRegularization = async (req: Request, res: Response): Promise<void> => {
  const parsed = regularizationCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  const { attendanceId, date, reason, requestedIn, requestedOut, type } = parsed.data;

  const employee = await prisma.employee.findUnique({ where: { userId: req.user!.userId } });
  if (!employee) {
    res.status(404).json({ error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee profile not found' } });
    return;
  }

  let finalAttendanceId = attendanceId;

  if (finalAttendanceId) {
    // Verify the attendance record exists and belongs to the requesting employee
    const attendanceRecord = await prisma.attendanceRecord.findUnique({ where: { id: finalAttendanceId } });
    if (!attendanceRecord) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Attendance record not found' } });
      return;
    }
    if (attendanceRecord.employeeId !== employee.id) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You can only regularize your own attendance records' } });
      return;
    }
  } else if (date) {
    const dateObj = new Date(`${date}T00:00:00.000Z`);
    
    // Cannot regularize future dates
    if (dateObj > new Date()) {
      res.status(400).json({ error: { code: 'INVALID_DATE', message: 'Cannot regularize future dates' } });
      return;
    }

    let attendanceRecord = await prisma.attendanceRecord.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: dateObj
        }
      }
    });

    if (!attendanceRecord) {
      attendanceRecord = await prisma.attendanceRecord.create({
        data: {
          employeeId: employee.id,
          date: dateObj,
          status: 'ABSENT',
          source: 'WEB'
        }
      });
    }

    finalAttendanceId = attendanceRecord.id;
  }

  // Check if a regularization request already exists for this record
  const existingReq = await prisma.regularizationRequest.findUnique({ where: { attendanceId: finalAttendanceId } });
  if (existingReq) {
    res.status(400).json({ error: { code: 'ALREADY_EXISTS', message: 'A regularization request already exists for this attendance record' } });
    return;
  }

  const regularization = await prisma.regularizationRequest.create({
    data: {
      attendanceId: finalAttendanceId as string,
      type: type || 'REGULAR',
      reason,
      requestedIn: requestedIn ? new Date(requestedIn) : null,
      requestedOut: requestedOut ? new Date(requestedOut) : null,
    },
  });

  res.status(201).json({ data: regularization });

  // Notify HR
  try {
    const hrUserIds = await getHRAdminUserIds();
    if (hrUserIds.length > 0) {
      await notifyUsers({
        userIds: hrUserIds,
        title: '🕒 Regularization Request',
        message: `${employee.firstName} ${employee.lastName} submitted an attendance regularization request.`,
        type: 'ATTENDANCE',
        linkUrl: '/admin/regularizations',
      });
    }
  } catch (err) {
    console.error('Failed to notify HR of regularization request', err);
  }
};

// ── PATCH /api/attendance/regularize/:id (admin) ─────────────
export const reviewRegularization = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const parsed = regularizationReviewSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  const { status, remarks } = parsed.data;

  const regularization = await prisma.regularizationRequest.findUnique({
    where: { id },
    include: { attendance: true },
  }) as any;

  if (!regularization) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Regularization request not found' } });
    return;
  }

  if (regularization.status !== 'PENDING') {
    res.status(400).json({ error: { code: 'ALREADY_REVIEWED', message: 'This request has already been reviewed' } });
    return;
  }

  const employee = await prisma.employee.findUnique({ where: { userId: req.user!.userId } });

  const updated = await prisma.$transaction(async (tx) => {
    // Update the regularization request
    const updatedReq = await tx.regularizationRequest.update({
      where: { id },
      data: {
        status,
        remarks: remarks ?? null,
        reviewedById: employee?.id ?? null,
        reviewedAt: new Date(),
      },
    });

    // If approved, update the attendance record
    if (status === 'APPROVED') {
      const isWfh = regularization.type === 'WFH';
      const finalPunchIn = regularization.requestedIn || regularization.attendance.punchInTime;
      const finalPunchOut = regularization.requestedOut || regularization.attendance.punchOutTime;
      
      let workHours = regularization.attendance.workHours;
      if (finalPunchIn && finalPunchOut) {
        workHours = parseFloat(((finalPunchOut.getTime() - finalPunchIn.getTime()) / (1000 * 60 * 60)).toFixed(2));
      }

      let newStatus: string;
      if (isWfh) {
        newStatus = 'WFH';
      } else if (finalPunchIn) {
        newStatus = (await isLateArrival(finalPunchIn)) ? 'LATE' : 'PRESENT';
      } else {
        newStatus = regularization.attendance.status;
      }

      await tx.attendanceRecord.update({
        where: { id: regularization.attendanceId },
        data: {
          isRegularized: true,
          status: newStatus as any,
          ...(regularization.requestedIn ? { punchInTime: regularization.requestedIn } : {}),
          ...(regularization.requestedOut ? { punchOutTime: regularization.requestedOut } : {}),
          ...(workHours !== null && workHours !== undefined ? { workHours } : {}),
        },
      });
    }

    return updatedReq;
  });

  if (updated.status === 'APPROVED' && updated.requestedOut) {
    processCompOffForAttendance(updated.attendanceId).catch(err => console.error(err));
  }

  res.json({ data: updated });

  // Notify Employee
  try {
    const targetEmployee = await prisma.employee.findUnique({
      where: { id: regularization.attendance.employeeId },
      select: { userId: true }
    });
    if (targetEmployee?.userId) {
      await notifyUsers({
        userIds: [targetEmployee.userId],
        title: `🕒 Regularization ${status}`,
        message: `Your regularization request for ${regularization.attendance.date.toLocaleDateString()} was ${status.toLowerCase()}${remarks ? ` with remarks: ${remarks}` : ''}.`,
        type: 'ATTENDANCE',
        linkUrl: '/employee/attendance',
      });
    }
  } catch (err) {
    console.error('Failed to send regularization review notification', err);
  }
};

// ── GET /api/attendance/regularizations (admin) ──────────────
export const getPendingRegularizations = async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const [requests, total] = await Promise.all([
    prisma.regularizationRequest.findMany({
      where: { status: 'PENDING' },
      skip,
      take: limit,
      include: {
        attendance: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeCode: true,
                department: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.regularizationRequest.count({ where: { status: 'PENDING' } }),
  ]);

  res.json({
    data: requests,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
};
