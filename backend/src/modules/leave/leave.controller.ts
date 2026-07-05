import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../../config/database';
import {
  createLeaveTypeSchema,
  updateLeaveTypeSchema,
  applyLeaveSchema,
  reviewLeaveSchema,
  initBalancesSchema,
  leaveQuerySchema,
  uploadLeaveDocSchema,
} from './leave.validation';
import { broadcastToRole, getHRAdminUserIds, getEmployeeName, notifyUsers } from '../../services/notification.service';
import { sendEmail } from '../../lib/email';
import { uploadFile, getSignedUrl } from '../../lib/storage';

// ── Helpers ──────────────────────────────────────────────────

/** Count weekdays (Mon–Fri) between two dates, inclusive. */
const countWeekdays = (start: Date, end: Date): number => {
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
};

// ══════════════════════════════════════════════════════════════
// LEAVE TYPES (Admin CRUD)
// ══════════════════════════════════════════════════════════════

// ── GET /api/leave/types ─────────────────────────────────────
export const getLeaveTypes = async (_req: Request, res: Response): Promise<void> => {
  const leaveTypes = await prisma.leaveType.findMany({
    orderBy: { name: 'asc' },
  });

  res.json({ data: leaveTypes });
};

// ── POST /api/leave/types ────────────────────────────────────
export const createLeaveType = async (req: Request, res: Response): Promise<void> => {
  const parsed = createLeaveTypeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  const { name, code } = parsed.data;

  // Check for duplicate name or code
  const existing = await prisma.leaveType.findFirst({
    where: { OR: [{ name }, { code }] },
  });
  if (existing) {
    res.status(409).json({ error: { code: 'DUPLICATE', message: 'A leave type with this name or code already exists' } });
    return;
  }

  const leaveType = await prisma.leaveType.create({ data: parsed.data });

  res.status(201).json({ data: leaveType });
};

// ── PATCH /api/leave/types/:id ───────────────────────────────
export const updateLeaveType = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const parsed = updateLeaveTypeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  const existing = await prisma.leaveType.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Leave type not found' } });
    return;
  }

  // Check for duplicate name or code if being updated
  const { name, code } = parsed.data;
  if (name || code) {
    const duplicate = await prisma.leaveType.findFirst({
      where: {
        id: { not: id },
        OR: [
          ...(name ? [{ name }] : []),
          ...(code ? [{ code }] : []),
        ],
      },
    });
    if (duplicate) {
      res.status(409).json({ error: { code: 'DUPLICATE', message: 'A leave type with this name or code already exists' } });
      return;
    }
  }

  const leaveType = await prisma.leaveType.update({
    where: { id },
    data: parsed.data,
  });

  res.json({ data: leaveType });
};

// ── DELETE /api/leave/types/:id ──────────────────────────────
export const deleteLeaveType = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const existing = await prisma.leaveType.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Leave type not found' } });
    return;
  }

  // Prevent deletion if leave requests exist for this type
  const requestCount = await prisma.leaveRequest.count({ where: { leaveTypeId: id } });
  if (requestCount > 0) {
    res.status(400).json({ error: { code: 'HAS_REQUESTS', message: 'Cannot delete leave type with existing leave requests' } });
    return;
  }

  await prisma.leaveType.delete({ where: { id } });

  res.json({ data: { message: 'Leave type deleted successfully' } });
};

// ══════════════════════════════════════════════════════════════
// LEAVE BALANCES
// ══════════════════════════════════════════════════════════════

// ── GET /api/leave/balances/my ───────────────────────────────
export const getMyBalances = async (req: Request, res: Response): Promise<void> => {
  const employee = await prisma.employee.findUnique({ where: { userId: req.user!.userId } });
  if (!employee) {
    res.status(404).json({ error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee profile not found' } });
    return;
  }

  const year = new Date().getFullYear();

  const balances = await prisma.leaveBalance.findMany({
    where: { employeeId: employee.id, year },
    include: { leaveType: true },
    orderBy: { leaveType: { name: 'asc' } },
  });

  res.json({ data: balances });
};

// ── GET /api/leave/balances ──────────────────────────────────
export const getAllBalances = async (req: Request, res: Response): Promise<void> => {
  const employeeId = req.query.employeeId as string | undefined;
  const yearStr = req.query.year as string | undefined;
  const year = yearStr ? parseInt(yearStr, 10) : new Date().getFullYear();

  const where: Prisma.LeaveBalanceWhereInput = {
    year,
    ...(employeeId ? { employeeId } : {}),
  };

  const balances = await prisma.leaveBalance.findMany({
    where,
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
      leaveType: true,
    },
    orderBy: [{ employee: { firstName: 'asc' } }, { leaveType: { name: 'asc' } }],
  });

  res.json({ data: balances });
};

// ── POST /api/leave/balances/init ────────────────────────────
export const initializeBalances = async (req: Request, res: Response): Promise<void> => {
  const parsed = initBalancesSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  const { year, employeeIds } = parsed.data;

  // Get target employees
  const employees = await prisma.employee.findMany({
    where: {
      status: 'ACTIVE',
      ...(employeeIds && employeeIds.length > 0 ? { id: { in: employeeIds } } : {}),
    },
    select: { id: true },
  });

  if (employees.length === 0) {
    res.status(404).json({ error: { code: 'NO_EMPLOYEES', message: 'No active employees found' } });
    return;
  }

  // Get all leave types
  const leaveTypes = await prisma.leaveType.findMany();

  if (leaveTypes.length === 0) {
    res.status(404).json({ error: { code: 'NO_LEAVE_TYPES', message: 'No leave types configured' } });
    return;
  }

  // Upsert balances for each employee × leave type combo
  const upsertOperations = [];

  for (const employee of employees) {
    for (const leaveType of leaveTypes) {
      upsertOperations.push(
        prisma.leaveBalance.upsert({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId: employee.id,
              leaveTypeId: leaveType.id,
              year,
            },
          },
          create: {
            employeeId: employee.id,
            leaveTypeId: leaveType.id,
            year,
            totalDays: leaveType.maxDaysPerYear,
            usedDays: 0,
            pendingDays: 0,
            remainingDays: leaveType.maxDaysPerYear,
          },
          update: {
            totalDays: leaveType.maxDaysPerYear,
            remainingDays: leaveType.maxDaysPerYear,
            usedDays: 0,
            pendingDays: 0,
          },
        })
      );
    }
  }

  // Execute all upserts in a single bundled database transaction
  await prisma.$transaction(upsertOperations);

  const created = employees.length * leaveTypes.length;

  res.status(201).json({
    data: {
      message: 'Balances initialized successfully',
      year,
      employeesProcessed: employees.length,
      leaveTypesProcessed: leaveTypes.length,
      totalRecords: created,
    },
  });
};

// ══════════════════════════════════════════════════════════════
// LEAVE REQUESTS
// ══════════════════════════════════════════════════════════════

// ── POST /api/leave/apply ────────────────────────────────────
export const applyLeave = async (req: Request, res: Response): Promise<void> => {
  const parsed = applyLeaveSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  const { leaveTypeId, startDate: startStr, endDate: endStr, reason, attachment, childNumber, expectedDeliveryDate: eddStr } = parsed.data;

  const employee = await prisma.employee.findUnique({ where: { userId: req.user!.userId } });
  if (!employee) {
    res.status(404).json({ error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee profile not found' } });
    return;
  }

  // Verify leave type exists
  const leaveType = await prisma.leaveType.findUnique({ where: { id: leaveTypeId } });
  if (!leaveType) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Leave type not found' } });
    return;
  }

  const startDate = new Date(startStr);
  const endDate = new Date(endStr);

  // Validate date range
  if (endDate < startDate) {
    res.status(400).json({ error: { code: 'INVALID_DATE_RANGE', message: 'End date must be on or after start date' } });
    return;
  }

  const isMaternityLeave = leaveType.code === 'ML' || leaveType.name.toLowerCase().includes('maternity');

  // Calculate total days
  let totalDays = 0;
  if (isMaternityLeave) {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Calendar days inclusive
  } else {
    totalDays = countWeekdays(startDate, endDate);
  }

  if (totalDays === 0) {
    res.status(400).json({ error: { code: 'NO_WORKING_DAYS', message: 'No valid days in the selected date range' } });
    return;
  }

  const year = startDate.getFullYear();

  // Handle Probation Leave Validations
  if (leaveType.code === 'CL' || leaveType.code === 'PL') {
    if (employee.probationEndsAt && new Date() < new Date(employee.probationEndsAt)) {
      res.status(403).json({ error: { code: 'PROBATION_ACTIVE', message: `Cannot request ${leaveType.code} during the probation period.` } });
      return;
    }
  }

  // Handle Maternity Leave Validations
  if (isMaternityLeave) {
    if (!childNumber || !eddStr) {
      res.status(400).json({ error: { code: 'MISSING_ML_FIELDS', message: 'Child number and expected delivery date are required for Maternity Leave' } });
      return;
    }

    const edd = new Date(eddStr);
    const maxTotalDays = childNumber <= 2 ? 182 : 84;
    const maxPreDeliveryDays = childNumber <= 2 ? 56 : 42;

    if (totalDays > maxTotalDays) {
      res.status(400).json({ error: { code: 'EXCEEDS_MAX_LEAVE', message: `Maternity leave cannot exceed ${maxTotalDays} days for child number ${childNumber}.` } });
      return;
    }

    if (startDate < edd) {
      const preDeliveryDiff = Math.ceil((edd.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      if (preDeliveryDiff > maxPreDeliveryDays) {
        res.status(400).json({ error: { code: 'EXCEEDS_PRE_DELIVERY_LEAVE', message: `Maximum pre-delivery leave allowed is ${maxPreDeliveryDays} days (8 weeks).` } });
        return;
      }
    }

    // Check for duplicate maternity leave for the same child
    const existingML = await prisma.leaveRequest.findFirst({
      where: {
        employeeId: employee.id,
        leaveTypeId: leaveType.id,
        status: { in: ['PENDING', 'APPROVED'] },
        childNumber,
      }
    });

    if (existingML) {
      res.status(400).json({ error: { code: 'DUPLICATE_ML', message: `A maternity leave request already exists for child number ${childNumber}.` } });
      return;
    }
  }

  // Check Sick Leave rules
  const isSickLeave = leaveType.code === 'SL' || leaveType.name.toLowerCase().includes('sick');
  const needsCertificate = isSickLeave && totalDays >= 3;
  let initialStatus = 'PENDING';
  if (needsCertificate && !attachment) {
    initialStatus = 'PENDING_DOCS';
  }

  try {
    const leaveRequest = await prisma.$transaction(async (tx) => {
      if (!isMaternityLeave) {
        const balance = await tx.leaveBalance.findUnique({
          where: { employeeId_leaveTypeId_year: { employeeId: employee.id, leaveTypeId, year } },
        });

        if (!balance) {
          throw new Error('NO_BALANCE');
        }

        if (balance.remainingDays < totalDays) {
          throw new Error(`INSUFFICIENT_BALANCE:${balance.remainingDays}`);
        }
      }

      // Check for overlapping leave requests (PENDING or APPROVED)
      const overlapping = await tx.leaveRequest.findFirst({
        where: {
          employeeId: employee.id,
          status: { in: ['PENDING', 'APPROVED'] },
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
      });

      if (overlapping) {
        throw new Error('OVERLAPPING_LEAVE');
      }

      const request = await tx.leaveRequest.create({
        data: {
          employeeId: employee.id,
          leaveTypeId,
          startDate,
          endDate,
          totalDays,
          reason,
          attachment: attachment ?? null,
          childNumber: isMaternityLeave ? childNumber : null,
          expectedDeliveryDate: isMaternityLeave ? new Date(eddStr!) : null,
          status: initialStatus as any,
        },
        include: { leaveType: true },
      });

      // Update balance: increment pendingDays, decrement remainingDays
      // Bypass balance updates for Maternity Leave
      if (!isMaternityLeave) {
        await tx.leaveBalance.update({
          where: {
            employeeId_leaveTypeId_year: { employeeId: employee.id, leaveTypeId, year },
          },
          data: {
            pendingDays: { increment: totalDays },
            remainingDays: { decrement: totalDays },
          },
        });
      }

      return request;
    });

    res.status(201).json({ data: leaveRequest });
  } catch (error: any) {
    if (error.message === 'NO_BALANCE') {
      res.status(400).json({ error: { code: 'NO_BALANCE', message: 'Leave balance not initialized for this year. Contact your administrator.' } });
      return;
    }
    if (error.message.startsWith('INSUFFICIENT_BALANCE')) {
      const parts = error.message.split(':');
      res.status(400).json({ error: { code: 'INSUFFICIENT_BALANCE', message: `Insufficient leave balance. Available: ${parts[1] || 0} days, Requested: ${totalDays} days` } });
      return;
    }
    if (error.message === 'OVERLAPPING_LEAVE') {
      res.status(400).json({ error: { code: 'OVERLAPPING_LEAVE', message: 'You already have a leave request overlapping with this date range' } });
      return;
    }
    console.error('Error applying leave:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to process leave application', details: error.message } });
    return;
  }

  // Notify Manager and HR
  try {
    const hrUserIds = await getHRAdminUserIds();
    const notificationUserIds = new Set(hrUserIds);
    if (employee.managerId) {
      const manager = await prisma.employee.findUnique({ where: { id: employee.managerId } });
      if (manager && manager.userId) notificationUserIds.add(manager.userId);
    }
    
    await notifyUsers({
      userIds: Array.from(notificationUserIds),
      title: '📅 New Leave Request',
      message: `${employee.firstName} ${employee.lastName} requested ${totalDays} day(s) of ${leaveType.name} (${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}).`,
      type: 'LEAVE',
      linkUrl: `/admin/leave`,
    });
  } catch (err) {
    console.error('Failed to send leave request notification', err);
  }
};

// ── GET /api/leave/my ────────────────────────────────────────
export const getMyLeaves = async (req: Request, res: Response): Promise<void> => {
  const queryParsed = leaveQuerySchema.safeParse(req.query);
  if (!queryParsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid query', details: queryParsed.error.flatten() } });
    return;
  }

  const employee = await prisma.employee.findUnique({ where: { userId: req.user!.userId } });
  if (!employee) {
    res.status(404).json({ error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee profile not found' } });
    return;
  }

  const { status, startDate, endDate, leaveTypeId, page = 1, limit = 20 } = queryParsed.data;
  const skip = (page - 1) * limit;

  const where: Prisma.LeaveRequestWhereInput = {
    employeeId: employee.id,
    ...(status ? { status } : {}),
    ...(leaveTypeId ? { leaveTypeId } : {}),
    ...(startDate || endDate
      ? {
          startDate: {
            ...(startDate ? { gte: new Date(startDate) } : {}),
            ...(endDate ? { lte: new Date(endDate) } : {}),
          },
        }
      : {}),
  };

  const [requests, total] = await Promise.all([
    prisma.leaveRequest.findMany({
      where,
      skip,
      take: limit,
      include: { leaveType: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.leaveRequest.count({ where }),
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

// ── GET /api/leave/requests ──────────────────────────────────
export const getAllLeaveRequests = async (req: Request, res: Response): Promise<void> => {
  const queryParsed = leaveQuerySchema.safeParse(req.query);
  if (!queryParsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid query', details: queryParsed.error.flatten() } });
    return;
  }

  const { status, startDate, endDate, leaveTypeId, employeeId, page = 1, limit = 20 } = queryParsed.data;
  const skip = (page - 1) * limit;

  const where: Prisma.LeaveRequestWhereInput = {
    ...(status ? { status } : {}),
    ...(leaveTypeId ? { leaveTypeId } : {}),
    ...(employeeId ? { employeeId } : {}),
    ...(startDate || endDate
      ? {
          startDate: {
            ...(startDate ? { gte: new Date(startDate) } : {}),
            ...(endDate ? { lte: new Date(endDate) } : {}),
          },
        }
      : {}),
  };

  const [requests, total] = await Promise.all([
    prisma.leaveRequest.findMany({
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
        leaveType: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.leaveRequest.count({ where }),
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

// ── PATCH /api/leave/requests/:id/review ─────────────────────
export const reviewLeave = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const parsed = reviewLeaveSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  const { status, remarks } = parsed.data;

  const leaveRequest = await prisma.leaveRequest.findUnique({ where: { id }, include: { leaveType: true } });
  if (!leaveRequest) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Leave request not found' } });
    return;
  }

  if (leaveRequest.status !== 'PENDING' && leaveRequest.status !== 'PENDING_DOCS') {
    res.status(400).json({ error: { code: 'ALREADY_REVIEWED', message: 'This leave request has already been reviewed' } });
    return;
  }

  const isSickLeave = leaveRequest.leaveType.code === 'SL' || leaveRequest.leaveType.name.toLowerCase().includes('sick');
  if (status === 'APPROVED' && isSickLeave && leaveRequest.totalDays >= 3 && !leaveRequest.attachment) {
    res.status(400).json({ error: { code: 'MEDICAL_CERT_REQUIRED', message: 'A medical certificate is required to approve Sick Leaves of 3 or more days.' } });
    return;
  }

  // Pre-check: if approving, find dates that already have valid attendance (PRESENT/LATE/WFH)
  let skippedDates: string[] = [];
  if (status === 'APPROVED') {
    const startDate = new Date(leaveRequest.startDate.toISOString().split('T')[0] + 'T00:00:00.000Z');
    const endDate = new Date(leaveRequest.endDate.toISOString().split('T')[0] + 'T00:00:00.000Z');
    const datesToCheck: Date[] = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getUTCDay(); // 0=Sun, 6=Sat
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        datesToCheck.push(new Date(d));
      }
    }
    // Find existing attendance records for these dates
    const existingRecords = await prisma.attendanceRecord.findMany({
      where: {
        employeeId: leaveRequest.employeeId,
        date: { in: datesToCheck },
        status: { in: ['PRESENT', 'LATE', 'WFH'] },
      },
    });
    skippedDates = existingRecords.map(r => r.date.toISOString().split('T')[0]);
  }

  const approver = await prisma.employee.findUnique({ where: { userId: req.user!.userId } });

  const updated = await prisma.$transaction(async (tx) => {
    // Update the leave request
    const updatedRequest = await tx.leaveRequest.update({
      where: { id },
      data: {
        status,
        remarks: remarks ?? null,
        approvedById: approver?.id ?? null,
        approvedAt: new Date(),
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            user: { select: { email: true } },
          },
        },
        leaveType: true,
      },
    });

    const year = leaveRequest.startDate.getFullYear();

    if (status === 'APPROVED') {
      // Move pendingDays → usedDays
      await tx.leaveBalance.update({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: leaveRequest.employeeId,
            leaveTypeId: leaveRequest.leaveTypeId,
            year,
          },
        },
        data: {
          pendingDays: { decrement: leaveRequest.totalDays },
          usedDays: { increment: leaveRequest.totalDays },
        },
      });

      // ── Sync Attendance Calendar ──────────────────────────
      const startDate = new Date(leaveRequest.startDate.toISOString().split('T')[0] + 'T00:00:00.000Z');
      const endDate = new Date(leaveRequest.endDate.toISOString().split('T')[0] + 'T00:00:00.000Z');
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getUTCDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends

        const dateToSync = new Date(d);
        const dateStr = dateToSync.toISOString().split('T')[0];

        // Skip dates that already have PRESENT/LATE/WFH
        if (skippedDates.includes(dateStr)) continue;

        // Upsert attendance record as ON_LEAVE
        await tx.attendanceRecord.upsert({
          where: {
            employeeId_date: {
              employeeId: leaveRequest.employeeId,
              date: dateToSync,
            },
          },
          create: {
            employeeId: leaveRequest.employeeId,
            date: dateToSync,
            status: 'ON_LEAVE',
            source: 'WEB',
          },
          update: {
            status: 'ON_LEAVE',
          },
        });
      }

      // Immediate employee status change if the leave covers today
      const todayStr = new Date().toISOString().split('T')[0];
      const today = new Date(todayStr);
      const reqStartStr = leaveRequest.startDate.toISOString().split('T')[0];
      const reqStart = new Date(reqStartStr);
      const reqEndStr = leaveRequest.endDate.toISOString().split('T')[0];
      const reqEnd = new Date(reqEndStr);

      if (reqStart <= today && reqEnd >= today) {
        await tx.employee.update({
          where: { id: leaveRequest.employeeId },
          data: { status: 'ON_LEAVE' },
        });
      }

    } else if (status === 'REJECTED') {
      // Restore pendingDays → remainingDays
      await tx.leaveBalance.update({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: leaveRequest.employeeId,
            leaveTypeId: leaveRequest.leaveTypeId,
            year,
          },
        },
        data: {
          pendingDays: { decrement: leaveRequest.totalDays },
          remainingDays: { increment: leaveRequest.totalDays },
        },
      });
    }

    return updatedRequest;
  });

  // Send Email Notification
  if (updated.employee.user?.email) {
    sendEmail({
      to: updated.employee.user.email,
      subject: `Leave Request ${updated.status}`,
      html: `
        <h2>Hi ${updated.employee.firstName},</h2>
        <p>Your leave request for <strong>${updated.totalDays} day(s)</strong> of ${updated.leaveType.name} 
        (from ${updated.startDate.toDateString()} to ${updated.endDate.toDateString()}) has been <strong>${updated.status}</strong>.</p>
        ${remarks ? `<p><strong>HR Remarks:</strong> ${remarks}</p>` : ''}
      `,
    });
  }

  const warnings: string[] = [];
  if (skippedDates.length > 0) {
    warnings.push(`The following dates were not changed to ON_LEAVE because they already have valid attendance (Present/Late/WFH): ${skippedDates.join(', ')}`);
  }

  res.json({ data: updated, ...(warnings.length > 0 ? { warnings } : {}) });

  // Notify Employee
  try {
    const targetEmployee = await prisma.employee.findUnique({ where: { id: leaveRequest.employeeId } });
    if (targetEmployee?.userId) {
      await notifyUsers({
        userIds: [targetEmployee.userId],
        title: `📅 Leave ${status}`,
        message: `Your ${updated.leaveType.name} request for ${updated.totalDays} day(s) was ${status.toLowerCase()}${remarks ? ` with remarks: ${remarks}` : ''}.`,
        type: 'LEAVE',
        linkUrl: `/employee/leave`,
      });
    }
  } catch (err) {
    console.error('Failed to send leave review notification', err);
  }
};

// ── PATCH /api/leave/requests/:id/cancel ─────────────────────
export const cancelLeave = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const employee = await prisma.employee.findUnique({ where: { userId: req.user!.userId } });
  if (!employee) {
    res.status(404).json({ error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee profile not found' } });
    return;
  }

  const leaveRequest = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!leaveRequest) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Leave request not found' } });
    return;
  }

  if (leaveRequest.employeeId !== employee.id) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You can only cancel your own leave requests' } });
    return;
  }

  if (leaveRequest.status !== 'PENDING' && leaveRequest.status !== 'PENDING_DOCS') {
    res.status(400).json({ error: { code: 'CANNOT_CANCEL', message: 'Only pending leave requests can be cancelled' } });
    return;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedRequest = await tx.leaveRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: { leaveType: true },
    });

    const year = leaveRequest.startDate.getFullYear();

    // Restore pendingDays → remainingDays
    await tx.leaveBalance.update({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: employee.id,
          leaveTypeId: leaveRequest.leaveTypeId,
          year,
        },
      },
      data: {
        pendingDays: { decrement: leaveRequest.totalDays },
        remainingDays: { increment: leaveRequest.totalDays },
      },
    });

    // Revert any ON_LEAVE attendance records back to ABSENT
    const startDate = new Date(leaveRequest.startDate.toISOString().split('T')[0] + 'T00:00:00.000Z');
    const endDate = new Date(leaveRequest.endDate.toISOString().split('T')[0] + 'T00:00:00.000Z');
    const datesToRevert: Date[] = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getUTCDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        datesToRevert.push(new Date(d));
      }
    }
    if (datesToRevert.length > 0) {
      await tx.attendanceRecord.updateMany({
        where: {
          employeeId: employee.id,
          date: { in: datesToRevert },
          status: 'ON_LEAVE',
        },
        data: { status: 'ABSENT' },
      });
    }

    return updatedRequest;
  });

  res.json({ data: updated });

  // Notify HR about leave cancellation
  try {
    const hrUserIds = await getHRAdminUserIds();
    if (hrUserIds.length > 0) {
      await notifyUsers({
        userIds: hrUserIds,
        title: '❌ Leave Cancelled',
        message: `${employee.firstName} ${employee.lastName} cancelled their ${updated.leaveType.name} request (${updated.totalDays} day(s)).`,
        type: 'LEAVE',
        linkUrl: '/admin/leave',
      });
    }
  } catch (err) {
    console.error('Failed to send leave cancellation notification', err);
  }
};

// ── GET /api/leave/summary ───────────────────────────────────
export const getLeaveSummary = async (_req: Request, res: Response): Promise<void> => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [
    totalPending,
    approvedThisMonth,
    rejectedThisMonth,
    topLeaveTypes,
  ] = await Promise.all([
    prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
    prisma.leaveRequest.count({
      where: {
        status: 'APPROVED',
        approvedAt: { gte: monthStart, lte: monthEnd },
      },
    }),
    prisma.leaveRequest.count({
      where: {
        status: 'REJECTED',
        approvedAt: { gte: monthStart, lte: monthEnd },
      },
    }),
    prisma.leaveRequest.groupBy({
      by: ['leaveTypeId'],
      _count: { id: true },
      where: {
        status: { in: ['APPROVED', 'PENDING'] },
        createdAt: { gte: monthStart, lte: monthEnd },
      },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    }),
  ]);

  // Resolve leave type names for the top types
  let topLeaveType = null;
  if (topLeaveTypes.length > 0) {
    const leaveType = await prisma.leaveType.findUnique({
      where: { id: topLeaveTypes[0].leaveTypeId },
    });
    topLeaveType = {
      id: topLeaveTypes[0].leaveTypeId,
      name: leaveType?.name ?? 'Unknown',
      count: topLeaveTypes[0]._count.id,
    };
  }

  res.json({
    data: {
      totalPending,
      approvedThisMonth,
      rejectedThisMonth,
      topLeaveType,
    },
  });
};

// ── PATCH /api/leave/requests/:id/document ───────────────────
export const uploadLeaveDocument = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const parsed = uploadLeaveDocSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  const employee = await prisma.employee.findUnique({ where: { userId: req.user!.userId } });
  if (!employee) {
    res.status(404).json({ error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee profile not found' } });
    return;
  }

  const leaveRequest = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!leaveRequest) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Leave request not found' } });
    return;
  }

  if (leaveRequest.employeeId !== employee.id) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You can only modify your own leave requests' } });
    return;
  }

  if (leaveRequest.status !== 'PENDING_DOCS') {
    res.status(400).json({ error: { code: 'INVALID_STATUS', message: 'You can only upload documents for leaves pending documentation' } });
    return;
  }

  const updated = await prisma.leaveRequest.update({
    where: { id },
    data: {
      attachment: parsed.data.attachment,
      status: 'PENDING',
    },
    include: { leaveType: true },
  });

  res.json({ data: updated });
};

// ── POST /api/leave/upload-attachment ────────────────────────────
export const uploadLeaveAttachment = async (req: Request, res: Response): Promise<void> => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: { code: 'NO_FILE', message: 'No file uploaded' } });
    return;
  }

  try {
    const employee = await prisma.employee.findUnique({ where: { userId: req.user!.userId } });
    if (!employee) {
      res.status(404).json({ error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee profile not found' } });
      return;
    }

    // Upload file to Supabase Storage
    const storagePath = await uploadFile('leave-attachments', file.originalname, file.buffer, file.mimetype);
    const signedUrl = await getSignedUrl(storagePath);

    res.status(201).json({ data: { fileUrl: storagePath, signedUrl } });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'UPLOAD_FAILED', message: 'Failed to upload document', details: error.message } });
  }
};

