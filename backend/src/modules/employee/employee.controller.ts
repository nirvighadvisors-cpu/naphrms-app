import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import crypto from 'crypto';
import prisma from '../../config/database';
import supabase from '../../config/supabase';
import { config } from '../../config/env';
import { createEmployeeSchema, updateEmployeeSchema, updateStatusSchema, updateMeSchema } from './employee.validation';
import { sendEmail } from '../../lib/email';
import { notifyUsers } from '../../services/notification.service';

// GET /api/employees/directory
export const getEmployeeDirectory = async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;
  const search = req.query.search as string;
  const departmentId = req.query.departmentId as string;

  const where: Prisma.EmployeeWhereInput = {
    status: 'ACTIVE',
    ...(departmentId ? { departmentId } : {}),
  };

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { employeeCode: { contains: search, mode: 'insensitive' } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const safeSelect = {
    id: true,
    employeeCode: true,
    firstName: true,
    lastName: true,
    profilePhotoUrl: true,
    designation: true,
    departmentId: true,
    department: { select: { name: true } },
    dateOfBirth: true,
    dateOfJoining: true,
    workSiteId: true,
    phone: true,
    emergencyContactName: true,
    emergencyContactPhone: true,
    user: { select: { email: true } },
  };

  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      skip,
      take: limit,
      select: safeSelect,
      orderBy: { firstName: 'asc' },
    }),
    prisma.employee.count({ where }),
  ]);

  res.json({
    data: employees,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
};

// GET /api/employees/directory/:id
export const getEmployeeDirectoryById = async (req: Request, res: Response): Promise<void> => {
  const employee = await prisma.employee.findUnique({
    where: { id: req.params.id as string },
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      profilePhotoUrl: true,
      designation: true,
      departmentId: true,
      department: { select: { name: true } },
      dateOfBirth: true,
      dateOfJoining: true,
      workSiteId: true,
      phone: true,
      emergencyContactName: true,
      emergencyContactPhone: true,
      user: { select: { email: true } },
      manager: { select: { firstName: true, lastName: true } },
    },
  });

  if (!employee) {
    res.status(404).json({ error: { message: 'Employee not found' } });
    return;
  }

  res.json({ data: employee });
};

// GET /api/employees
export const listEmployees = async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  // --- ONE-TIME ADMIN UPDATE ---
  try {
    let dept = await prisma.department.findFirst({ where: { name: 'Administration HR' } });
    if (!dept) {
      dept = await prisma.department.create({
        data: {
          name: 'Administration HR',
          code: 'ADMIN',
          codeInitial: 'A',
        }
      });
      console.log('✅ Created Administration HR department');
    }
    const adminUser = await prisma.user.findUnique({ where: { email: 'nirvighadvisors@gmail.com' }, include: { employee: true } });
    if (adminUser && adminUser.employee) {
      await prisma.employee.update({
        where: { id: adminUser.employee.id },
        data: { departmentId: dept.id, designation: 'Director' }
      });
      console.log('✅ Devang has been updated to Director in Administration HR via controller');
    }
  } catch (e) {
    console.error('Failed to update admin:', e);
  }
  // -----------------------------

  const search = req.query.search as string;
  const departmentId = req.query.departmentId as string;
  const status = req.query.status as any;
  const employmentType = req.query.employmentType as any;

  const where: Prisma.EmployeeWhereInput = {
    ...(departmentId ? { departmentId } : {}),
    ...(status ? { status } : { status: { not: 'TERMINATED' } }),
    ...(employmentType ? { employmentType } : {}),
  };

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { employeeCode: { contains: search, mode: 'insensitive' } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      skip,
      take: limit,
      include: {
        department: { select: { name: true } },
        user: { select: { email: true, status: true } },
        manager: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.employee.count({ where }),
  ]);

  res.json({
    data: employees,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
};

// GET /api/employees/stats
export const getEmployeeStats = async (_req: Request, res: Response): Promise<void> => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalEmployees, activeEmployees, newHiresThisMonth, totalDepartments, deptBreakdown, typeBreakdown, recentJoiners] = await Promise.all([
    prisma.employee.count(),
    prisma.employee.count({ where: { status: 'ACTIVE' } }),
    prisma.employee.count({ where: { dateOfJoining: { gte: startOfMonth }, status: 'ACTIVE' } }),
    prisma.department.count(),
    prisma.employee.groupBy({ by: ['departmentId'], where: { status: 'ACTIVE' }, _count: { id: true } }),
    prisma.employee.groupBy({ by: ['employmentType'], where: { status: 'ACTIVE' }, _count: { id: true } }),
    prisma.employee.findMany({
      take: 5,
      where: { status: 'ACTIVE' },
      orderBy: { dateOfJoining: 'desc' },
      include: { department: { select: { name: true } } },
    }),
  ]);

  // Fetch department names for the breakdown
  const departments = await prisma.department.findMany({
    where: { id: { in: deptBreakdown.map((d) => d.departmentId) } },
    select: { id: true, name: true },
  });

  const departmentBreakdown = deptBreakdown.map((d) => ({
    department: departments.find((dept) => dept.id === d.departmentId)?.name || 'Unknown',
    count: d._count.id,
  }));

  const employmentTypeBreakdown = typeBreakdown.map((t) => ({
    type: t.employmentType,
    count: t._count.id,
  }));

  const activeRate = totalEmployees > 0 ? Math.round((activeEmployees / totalEmployees) * 100) : 0;

  res.json({
    totalEmployees,
    activeRate,
    newHiresThisMonth,
    totalDepartments,
    departmentBreakdown,
    employmentTypeBreakdown,
    recentJoiners,
  });
};

// GET /api/employees/me
export const getMe = async (req: Request, res: Response): Promise<void> => {
  if (!req.user?.employeeId) {
    res.status(404).json({ error: { code: 'EMPLOYEE_NOT_FOUND', message: 'No employee record linked to this user' } });
    return;
  }

  const employee = await prisma.employee.findUnique({
    where: { id: req.user.employeeId },
    include: {
      department: { select: { name: true, code: true } },
      user: { select: { email: true, status: true, role: true } },
      manager: { select: { firstName: true, lastName: true } },
      documents: true,
    },
  });

  if (!employee) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' } });
    return;
  }

  res.json({ data: employee });
};

// PATCH /api/employees/me
export const updateMe = async (req: Request, res: Response): Promise<void> => {
  if (!req.user?.employeeId) {
    res.status(404).json({ error: { code: 'EMPLOYEE_NOT_FOUND', message: 'No employee record linked to this user' } });
    return;
  }

  const parsed = updateMeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  const updated = await prisma.employee.update({
    where: { id: req.user.employeeId },
    data: parsed.data,
  });

  res.json({ data: updated, message: 'Profile updated successfully' });
};

// GET /api/employees/:id
export const getEmployeeById = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      department: { select: { name: true, code: true } },
      user: { select: { email: true, status: true, role: true } },
      manager: { select: { firstName: true, lastName: true, employeeCode: true } },
      reportees: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
      _count: { select: { documents: true } },
    },
  });

  if (!employee) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' } });
    return;
  }

  res.json({ data: employee });
};

// POST /api/employees
export const createEmployee = async (req: Request, res: Response): Promise<void> => {
  const parsed = createEmployeeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  const { email, departmentId, dateOfJoining, ...employeeData } = parsed.data;

  // Check email uniqueness
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    res.status(400).json({ error: { code: 'EMAIL_EXISTS', message: 'Email is already in use' } });
    return;
  }

  // Check department exists
  const department = await prisma.department.findUnique({ where: { id: departmentId } });
  if (!department) {
    res.status(400).json({ error: { code: 'INVALID_DEPARTMENT', message: 'Department not found' } });
    return;
  }

  try {
    const employee = await prisma.$transaction(async (tx) => {
      // employeeCode will be generated after onboarding is complete
      const employeeCode = null;

      // 3. Generate invite token
      const inviteToken = crypto.randomBytes(32).toString('hex');
      const inviteExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

      // 4. Create User
      const user = await tx.user.create({
        data: {
          email,
          role: 'EMPLOYEE',
          status: 'INVITED',
          inviteToken,
          inviteExpiresAt,
        },
      });

      // 5. Create Employee
      const newEmployee = await tx.employee.create({
        data: {
          ...employeeData,
          employeeCode,
          departmentId,
          dateOfJoining: new Date(dateOfJoining),
          userId: user.id,
          status: 'PENDING_REGISTRATION',
          // Optional dates need to be parsed
          ...(employeeData.dateOfBirth ? { dateOfBirth: new Date(employeeData.dateOfBirth) } : {}),
        },
      });

      // 5b. Record initial status in history
      await tx.employeeStatusHistory.create({
        data: {
          employeeId: newEmployee.id,
          fromStatus: null,
          toStatus: 'PENDING_REGISTRATION',
          reason: 'Employee invited, awaiting registration',
          changedById: req.user?.userId || null,
        },
      });

      // 6. Send invite email
      const activationLink = `${config.appUrl}/activate?token=${inviteToken}`;
      sendEmail({
        to: email,
        subject: 'Welcome to NAP HRMS — Activate Your Account',
        html: `
          <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
            <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Welcome to Nirvigh Advisors</h1>
              <p style="color: #94a3b8; margin: 10px 0 0; font-size: 16px;">We're thrilled to have you on board, ${employeeData.firstName}!</p>
            </div>
            
            <div style="padding: 40px 30px; background-color: #ffffff;">
              <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-top: 0;">Hi ${employeeData.firstName},</p>
              <p style="color: #334155; font-size: 16px; line-height: 1.6;">Your employee account has been successfully created. To officially get started and receive your Employee ID, you just need to complete your onboarding profile.</p>
              
              <div style="background-color: #f8fafc; border-left: 4px solid #0d9488; padding: 20px; margin: 30px 0; border-radius: 0 8px 8px 0;">
                <p style="color: #0f172a; margin: 0; font-weight: 600; font-size: 15px;">Next Step:</p>
                <p style="color: #475569; margin: 5px 0 0; font-size: 14px;">Set your password and complete your registration by clicking the button below.</p>
              </div>
              
              <div style="text-align: center; margin: 40px 0;">
                <a href="${activationLink}" style="display: inline-block; padding: 14px 32px; background-color: #0d9488; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; transition: background-color 0.3s ease; box-shadow: 0 4px 6px -1px rgba(13, 148, 136, 0.2), 0 2px 4px -1px rgba(13, 148, 136, 0.1);">Complete Registration</a>
              </div>
              
              <p style="color: #64748b; font-size: 14px; margin: 0; text-align: center;">
                <span style="display: inline-block; margin-right: 5px;">⏳</span> This activation link will expire in <strong>72 hours</strong>.
              </p>
            </div>
            
            <div style="background-color: #f1f5f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} Nirvigh Advisors. All rights reserved.</p>
              <p style="color: #94a3b8; font-size: 12px; margin: 5px 0 0;">This is an automated message, please do not reply.</p>
            </div>
          </div>
        `,
      });

      return newEmployee;
    });

    res.status(201).json({ data: employee });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'CREATE_FAILED', message: 'Failed to create employee', details: error.message } });
  }
};

// PATCH /api/employees/:id
export const updateEmployee = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const parsed = updateEmployeeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  const { departmentId, dateOfJoining, dateOfBirth, ...updateData } = parsed.data;

  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' } });
    return;
  }

  if (departmentId && departmentId !== existing.departmentId) {
    const department = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!department) {
      res.status(400).json({ error: { code: 'INVALID_DEPARTMENT', message: 'Department not found' } });
      return;
    }
  }

  let weekOffHistoryUpdate = {};
  if (updateData.weekOffDays && JSON.stringify(updateData.weekOffDays) !== JSON.stringify(existing.weekOffDays)) {
    // 1. Enforce single day selection in backend
    const newWeekOffDay = updateData.weekOffDays[updateData.weekOffDays.length - 1];
    updateData.weekOffDays = [newWeekOffDay];

    const oldHistory: any[] = Array.isArray(existing.weekOffHistory) ? existing.weekOffHistory : [];

    if (oldHistory.length === 0 && existing.weekOffDays.length > 0) {
      oldHistory.push({
        weekOffDays: existing.weekOffDays,
        effectiveFrom: new Date(existing.dateOfJoining).toISOString()
      });
    }

    const today = new Date();
    const currentDay = today.getDay();
    const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    // Get the currently active week-off for TODAY
    const getWeekOffDaysForDate = (empHistory: any[], defaultDays: string[], d: Date) => {
      if (empHistory.length === 0) return defaultDays;
      const sorted = [...empHistory].sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());
      const t = d.getTime();
      for (const rec of sorted) {
        if (t >= new Date(rec.effectiveFrom).getTime()) return rec.weekOffDays;
      }
      return sorted[sorted.length - 1].weekOffDays || defaultDays;
    };

    const activeTodayArr = getWeekOffDaysForDate(oldHistory, existing.weekOffDays, today);
    const activeToday = activeTodayArr.length > 0 ? activeTodayArr[0] : 'SUNDAY';

    // Check if activeToday has been consumed this week
    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const getWeekIndex = (day: string) => {
      const idx = dayNames.indexOf(day.toUpperCase());
      return idx === 0 ? 6 : idx - 1; // Mon=0 ... Sun=6
    };

    const todayWeekIndex = getWeekIndex(dayNames[currentDay]);
    const activeTodayWeekIndex = getWeekIndex(activeToday);

    let effectiveDate = startOfWeek;
    if (activeTodayWeekIndex <= todayWeekIndex) {
      // old week-off already occurred this week (or is today). Push to next week!
      effectiveDate = new Date(startOfWeek);
      effectiveDate.setDate(effectiveDate.getDate() + 7);
    }

    // Clean overlapping future history records
    const cleanedHistory = oldHistory.filter(rec => new Date(rec.effectiveFrom).getTime() < effectiveDate.getTime());

    cleanedHistory.push({
      weekOffDays: updateData.weekOffDays,
      effectiveFrom: effectiveDate.toISOString()
    });

    weekOffHistoryUpdate = { weekOffHistory: cleanedHistory };
  }

  const updated = await prisma.employee.update({
    where: { id },
    data: {
      ...updateData,
      ...weekOffHistoryUpdate,
      ...(departmentId ? { departmentId } : {}),
      ...(dateOfJoining ? { dateOfJoining: new Date(dateOfJoining) } : {}),
      ...(dateOfBirth !== undefined ? { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null } : {}),
    },
  });

  res.json({ data: updated });
};

// PATCH /api/employees/:id/status
export const changeEmployeeStatus = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const parsed = updateStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  const { status, reason } = parsed.data;

  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' } });
    return;
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      let dateOfLeaving = existing.dateOfLeaving;
      let userStatus: 'ACTIVE' | 'INACTIVE' = 'ACTIVE';

      if (status === 'TERMINATED') {
        dateOfLeaving = new Date();
        userStatus = 'INACTIVE';
      } else if (status === 'ACTIVE') {
        dateOfLeaving = null;
        userStatus = 'ACTIVE';
      } else if (status === 'INACTIVE') {
        dateOfLeaving = new Date();
        userStatus = 'INACTIVE';
      }

      const emp = await tx.employee.update({
        where: { id },
        data: { status, dateOfLeaving },
      });

      await tx.user.update({
        where: { id: existing.userId },
        data: { status: userStatus },
      });

      // Record status change in history
      await tx.employeeStatusHistory.create({
        data: {
          employeeId: id,
          fromStatus: existing.status,
          toStatus: status,
          reason: reason || null,
          changedById: req.user?.userId || null,
        },
      });

      return emp;
    });

    res.json({ data: updated });

    // Notify Employee
    if (existing.userId) {
      try {
        await notifyUsers({
          userIds: [existing.userId],
          title: '🔄 Status Updated',
          message: `Your employment status has been changed to ${status.replace(/_/g, ' ')}.`,
          type: 'SYSTEM',
          linkUrl: '/employee/profile',
        });
      } catch (err) {
        console.error('Failed to notify employee of status change', err);
      }
    }
  } catch (error: any) {
    res.status(500).json({ error: { code: 'UPDATE_FAILED', message: 'Failed to update status' } });
  }
};

// DELETE /api/employees/:id
export const deleteEmployee = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' } });
    return;
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Unlink managerId from reportees
      await tx.employee.updateMany({
        where: { managerId: id },
        data: { managerId: null },
      });

      // 2. Delete all related records for the employee
      await tx.dailyLog.deleteMany({ where: { employeeId: id } });
      await tx.attendanceRecord.deleteMany({ where: { employeeId: id } });
      await tx.leaveBalance.deleteMany({ where: { employeeId: id } });
      await tx.leaveRequest.deleteMany({ where: { employeeId: id } });
      await tx.payslip.deleteMany({ where: { employeeId: id } });
      await tx.expenseClaim.deleteMany({ where: { employeeId: id } });
      await tx.employeeDocument.deleteMany({ where: { employeeId: id } });
      await tx.goal.deleteMany({ where: { employeeId: id } });
      await tx.review.deleteMany({ where: { employeeId: id } });
      await tx.employeeStatusHistory.deleteMany({ where: { employeeId: id } });

      // 3. Delete related records for the user
      await tx.auditLog.deleteMany({ where: { userId: existing.userId } });
      await tx.notification.deleteMany({ where: { userId: existing.userId } });

      // 4. Finally delete employee and user
      await tx.employee.delete({ where: { id } });
      await tx.user.delete({ where: { id: existing.userId } });
    });

    res.json({ data: { message: 'Employee and all associated records permanently deleted' } });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'DELETE_FAILED', message: 'Failed to delete employee completely', details: error.message } });
  }
};

// PATCH /api/employees/:id/finalize-offer
export const finalizeOffer = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const file = req.file;

  if (!file) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'PDF file is required' } });
    return;
  }

  try {
    const { uploadFile } = await import('../../lib/storage');
    const storagePath = await uploadFile(`${id}/documents`, file.originalname, file.buffer, file.mimetype);

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        finalOfferLetterUrl: storagePath,
        offerLetterStatus: 'OFFER_FINALIZED',
      },
    });

    // Also add it to the employee's documents list
    await prisma.employeeDocument.create({
      data: {
        employeeId: id,
        type: 'OFFER_LETTER',
        fileName: file.originalname || 'final_offer_letter.pdf',
        fileUrl: storagePath,
        fileSize: file.size,
        uploadedById: req.user!.userId,
      }
    });

    res.json({ data: updated });

    // Notify Employee
    if (updated.userId) {
      try {
        await notifyUsers({
          userIds: [updated.userId],
          title: '📄 Offer Letter Finalized',
          message: 'Your final offer letter has been generated and is ready to view.',
          type: 'SYSTEM',
          linkUrl: '/employee/profile',
        });
      } catch (err) {
        console.error('Failed to notify employee of offer letter finalization', err);
      }
    }
  } catch (error: any) {
    res.status(500).json({ error: { code: 'UPDATE_FAILED', message: 'Failed to finalize offer letter', details: error.message } });
  }
};

// GET /api/employees/:id/history
export const getEmployeeHistory = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  try {
    const history = await prisma.employeeStatusHistory.findMany({
      where: { employeeId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        changedBy: {
          select: { email: true, employee: { select: { firstName: true, lastName: true } } },
        },
      },
    });

    res.json({ data: history });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'FETCH_FAILED', message: 'Failed to fetch status history' } });
  }
};

// POST /api/employees/:id/resend-invite
export const resendInvitation = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  try {
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!employee || !employee.user) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' } });
      return;
    }

    if (employee.status !== 'PENDING_REGISTRATION' && employee.user.status !== 'INVITED') {
      res.status(400).json({ error: { code: 'NOT_PENDING', message: 'Employee is already registered' } });
      return;
    }

    // Generate new invite token
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

    await prisma.user.update({
      where: { id: employee.userId },
      data: { inviteToken, inviteExpiresAt },
    });

    // Send invite email
    const activationLink = `${config.appUrl}/activate?token=${inviteToken}`;
    sendEmail({
      to: employee.user.email,
      subject: 'Welcome to NAP HRMS — Activate Your Account',
        html: `
          <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
            <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Welcome to Nirvigh Advisors</h1>
              <p style="color: #94a3b8; margin: 10px 0 0; font-size: 16px;">We're thrilled to have you on board, ${employee.firstName}!</p>
            </div>
            
            <div style="padding: 40px 30px; background-color: #ffffff;">
              <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-top: 0;">Hi ${employee.firstName},</p>
              <p style="color: #334155; font-size: 16px; line-height: 1.6;">Your employee account has been successfully created. To officially get started and receive your Employee ID, you just need to complete your onboarding profile.</p>
              
              <div style="background-color: #f8fafc; border-left: 4px solid #0d9488; padding: 20px; margin: 30px 0; border-radius: 0 8px 8px 0;">
                <p style="color: #0f172a; margin: 0; font-weight: 600; font-size: 15px;">Next Step:</p>
                <p style="color: #475569; margin: 5px 0 0; font-size: 14px;">Set your password and complete your registration by clicking the button below.</p>
              </div>
              
              <div style="text-align: center; margin: 40px 0;">
                <a href="${activationLink}" style="display: inline-block; padding: 14px 32px; background-color: #0d9488; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; transition: background-color 0.3s ease; box-shadow: 0 4px 6px -1px rgba(13, 148, 136, 0.2), 0 2px 4px -1px rgba(13, 148, 136, 0.1);">Complete Registration</a>
              </div>
              
              <p style="color: #64748b; font-size: 14px; margin: 0; text-align: center;">
                <span style="display: inline-block; margin-right: 5px;">⏳</span> This activation link will expire in <strong>72 hours</strong>.
              </p>
            </div>
            
            <div style="background-color: #f1f5f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} Nirvigh Advisors. All rights reserved.</p>
              <p style="color: #94a3b8; font-size: 12px; margin: 5px 0 0;">This is an automated message, please do not reply.</p>
            </div>
          </div>
        `,
    });

    res.json({ data: { message: 'Invitation resent successfully' } });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'RESEND_FAILED', message: 'Failed to resend invitation', details: error.message } });
  }
};
// ── GET /api/employees/:id/offer-letter-urls ──────────────────────
export const getOfferLetterUrls = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const employee = await prisma.employee.findUnique({
      where: { id },
      select: { partialOfferLetterUrl: true, finalOfferLetterUrl: true }
    });

    if (!employee) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' } });
      return;
    }

    let partialUrl = null;
    let finalUrl = null;

    if (employee.partialOfferLetterUrl) {
      const { data } = await supabase.storage.from('hrms-documents').createSignedUrl(employee.partialOfferLetterUrl, 3600);
      partialUrl = data?.signedUrl || null;
    }
    
    if (employee.finalOfferLetterUrl) {
      const { data } = await supabase.storage.from('hrms-documents').createSignedUrl(employee.finalOfferLetterUrl, 3600);
      finalUrl = data?.signedUrl || null;
    }

    res.json({
      data: {
        partialUrl,
        finalUrl
      }
    });
  } catch (error: any) {
    console.error('Failed to get offer letter URLs:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to generate URLs' } });
  }
};
