import { Request, Response } from 'express';
import prisma from '../../config/database';
import { notifyUsers } from '../../services/notification.service';

// ── Admin: Create Announcement ──────────────────────────────
export const createAnnouncement = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, content, priority, targetDepartmentId, expiresAt } = req.body;

    if (!title || !content) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Title and content are required' } });
      return;
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        priority: priority || 'NORMAL',
        targetDepartmentId: targetDepartmentId || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        authorId: req.user!.userId,
      },
      include: {
        author: { select: { email: true, employee: { select: { firstName: true, lastName: true } } } },
        targetDepartment: { select: { name: true } },
      },
    });

    res.status(201).json({ data: announcement });

    // Notify all active employees (or department-specific)
    try {
      const whereClause: any = { status: 'ACTIVE', userId: { not: null } };
      if (targetDepartmentId) {
        whereClause.departmentId = targetDepartmentId;
      }
      const employees = await prisma.employee.findMany({
        where: whereClause,
        select: { userId: true },
      });
      const userIds = employees.map(e => e.userId).filter(Boolean) as string[];
      if (userIds.length > 0) {
        await notifyUsers({
          userIds,
          title: `📢 ${priority === 'URGENT' ? '🚨 Urgent: ' : ''}New Announcement`,
          message: title,
          type: 'SYSTEM',
          linkUrl: '/employee/dashboard',
        });
      }
    } catch (err) {
      console.error('Failed to send announcement notification', err);
    }
  } catch (error: any) {
    console.error('Create announcement error:', error);
    res.status(500).json({ error: { code: 'CREATE_FAILED', message: 'Failed to create announcement' } });
  }
};

// ── Admin: Update Announcement ──────────────────────────────
export const updateAnnouncement = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, content, priority, targetDepartmentId, expiresAt, isActive } = req.body;

    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Announcement not found' } });
      return;
    }

    const updated = await prisma.announcement.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(content !== undefined ? { content } : {}),
        ...(priority !== undefined ? { priority } : {}),
        ...(targetDepartmentId !== undefined ? { targetDepartmentId: targetDepartmentId || null } : {}),
        ...(expiresAt !== undefined ? { expiresAt: expiresAt ? new Date(expiresAt) : null } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
      include: {
        author: { select: { email: true, employee: { select: { firstName: true, lastName: true } } } },
        targetDepartment: { select: { name: true } },
      },
    });

    res.json({ data: updated });
  } catch (error: any) {
    console.error('Update announcement error:', error);
    res.status(500).json({ error: { code: 'UPDATE_FAILED', message: 'Failed to update announcement' } });
  }
};

// ── Admin: Delete Announcement ──────────────────────────────
export const deleteAnnouncement = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.announcement.delete({ where: { id } });
    res.json({ data: { message: 'Announcement deleted successfully' } });
  } catch (error: any) {
    console.error('Delete announcement error:', error);
    res.status(500).json({ error: { code: 'DELETE_FAILED', message: 'Failed to delete announcement' } });
  }
};

// ── Admin: List All Announcements (with read analytics) ─────
export const listAnnouncementsAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: { publishedAt: 'desc' },
      include: {
        author: { select: { email: true, employee: { select: { firstName: true, lastName: true } } } },
        targetDepartment: { select: { name: true } },
        _count: { select: { reads: true } },
      },
    });

    res.json({ data: announcements });
  } catch (error: any) {
    console.error('List announcements error:', error);
    res.status(500).json({ error: { code: 'FETCH_FAILED', message: 'Failed to fetch announcements' } });
  }
};

// ── Employee: Get Active Announcements ──────────────────────
export const getActiveAnnouncements = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    // Get employee's department for targeted announcements
    const employee = await prisma.employee.findUnique({
      where: { userId },
      select: { departmentId: true },
    });

    const now = new Date();
    const announcements = await prisma.announcement.findMany({
      where: {
        isActive: true,
        publishedAt: { lte: now },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
        // Show global announcements OR ones targeted at my department
        AND: {
          OR: [
            { targetDepartmentId: null },
            ...(employee?.departmentId ? [{ targetDepartmentId: employee.departmentId }] : []),
          ],
        },
      },
      orderBy: [
        { priority: 'asc' }, // URGENT first (alphabetically: INFO > NORMAL > URGENT — we handle in frontend)
        { publishedAt: 'desc' },
      ],
      include: {
        author: { select: { employee: { select: { firstName: true, lastName: true } } } },
        reads: {
          where: { userId },
          select: { readAt: true },
        },
      },
    });

    // Transform: add `isRead` flag
    const result = announcements.map((a) => ({
      ...a,
      isRead: a.reads.length > 0,
      reads: undefined,
    }));

    res.json({ data: result });
  } catch (error: any) {
    console.error('Get active announcements error:', error);
    res.status(500).json({ error: { code: 'FETCH_FAILED', message: 'Failed to fetch announcements' } });
  }
};

// ── Employee: Mark Announcement as Read ─────────────────────
export const markAnnouncementRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    await prisma.announcementRead.upsert({
      where: { announcementId_userId: { announcementId: id, userId } },
      create: { announcementId: id, userId },
      update: {},
    });

    res.json({ data: { message: 'Marked as read' } });
  } catch (error: any) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: { code: 'UPDATE_FAILED', message: 'Failed to mark as read' } });
  }
};

// ── Dashboard: Team Updates (Who's Away + Celebrations) ─────
export const getTeamUpdates = async (req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    // 1. Who's on leave today (approved leaves where today falls in range)
    const onLeaveToday = await prisma.leaveRequest.findMany({
      where: {
        status: 'APPROVED',
        startDate: { lte: today },
        endDate: { gte: today },
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        leaveType: { select: { name: true } },
        employee: {
          select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true, designation: true },
        },
      },
      take: 10,
    });

    // 2. Upcoming birthdays (next 7 days)
    // We need to find employees whose birthday (month+day) falls within the next 7 days
    const upcomingBirthdays: any[] = [];
    const allEmployees = await prisma.employee.findMany({
      where: { status: 'ACTIVE', dateOfBirth: { not: null } },
      select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true, dateOfBirth: true, designation: true },
    });

    for (const emp of allEmployees) {
      if (!emp.dateOfBirth) continue;
      const dob = new Date(emp.dateOfBirth);
      const thisYearBday = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
      // If already passed this year, check next year
      if (thisYearBday < today) {
        thisYearBday.setFullYear(thisYearBday.getFullYear() + 1);
      }
      if (thisYearBday >= today && thisYearBday <= endOfWeek) {
        upcomingBirthdays.push({ ...emp, birthdayDate: thisYearBday });
      }
    }

    // 3. Work anniversaries this month
    const workAnniversaries: any[] = [];
    const activeEmployees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true, dateOfJoining: true, designation: true },
    });

    for (const emp of activeEmployees) {
      const doj = new Date(emp.dateOfJoining);
      if (doj.getMonth() === now.getMonth() && doj.getFullYear() !== now.getFullYear()) {
        const years = now.getFullYear() - doj.getFullYear();
        workAnniversaries.push({ ...emp, years, anniversaryDate: new Date(now.getFullYear(), doj.getMonth(), doj.getDate()) });
      }
    }

    res.json({
      data: {
        onLeaveToday,
        upcomingBirthdays: upcomingBirthdays.sort((a, b) => a.birthdayDate - b.birthdayDate).slice(0, 5),
        workAnniversaries: workAnniversaries.sort((a, b) => a.anniversaryDate - b.anniversaryDate).slice(0, 5),
      },
    });
  } catch (error: any) {
    console.error('Team updates error:', error);
    res.status(500).json({ error: { code: 'FETCH_FAILED', message: 'Failed to fetch team updates' } });
  }
};

// ── Dashboard: My Latest Payslip ────────────────────────────
export const getMyLatestPayslip = async (req: Request, res: Response): Promise<void> => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { userId: req.user!.userId },
      select: { id: true },
    });

    if (!employee) {
      res.json({ data: null });
      return;
    }

    const latestPayslip = await prisma.payslip.findFirst({
      where: { employeeId: employee.id },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      select: {
        id: true,
        month: true,
        year: true,
        grossEarnings: true,
        totalDeductions: true,
        netPayable: true,
        generatedAt: true,
      },
    });

    res.json({ data: latestPayslip });
  } catch (error: any) {
    console.error('Latest payslip error:', error);
    res.status(500).json({ error: { code: 'FETCH_FAILED', message: 'Failed to fetch latest payslip' } });
  }
};
