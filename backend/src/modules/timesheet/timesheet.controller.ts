import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../../config/database';
import { submitDailyLogSchema } from './timesheet.validation';

// POST /api/timesheets
export const submitDailyLog = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    return;
  }

  const employee = await prisma.employee.findUnique({ where: { userId } });
  if (!employee) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' } });
    return;
  }

  const parsed = submitDailyLogSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  const { date, content } = parsed.data;
  const targetDate = new Date(date);

  try {
    const log = await prisma.dailyLog.upsert({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: targetDate,
        },
      },
      update: {
        content,
      },
      create: {
        employeeId: employee.id,
        date: targetDate,
        content,
      },
    });

    res.status(200).json({ data: log });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to submit log', details: error.message } });
  }
};

// GET /api/timesheets/my
export const getMyLogs = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    return;
  }

  const employee = await prisma.employee.findUnique({ where: { userId } });
  if (!employee) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' } });
    return;
  }

  const logs = await prisma.dailyLog.findMany({
    where: { employeeId: employee.id },
    orderBy: { date: 'desc' },
  });

  res.json({ data: logs });
};

// GET /api/timesheets/all
export const getAllLogs = async (req: Request, res: Response): Promise<void> => {
  const { date, employeeId } = req.query;

  const where: Prisma.DailyLogWhereInput = {};

  if (date) {
    where.date = new Date(date as string);
  }
  if (employeeId) {
    where.employeeId = employeeId as string;
  }

  const logs = await prisma.dailyLog.findMany({
    where,
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeCode: true,
          profilePhotoUrl: true,
          department: { select: { name: true } },
        },
      },
    },
    orderBy: [{ date: 'desc' }, { employee: { firstName: 'asc' } }],
  });

  res.json({ data: logs });
};
