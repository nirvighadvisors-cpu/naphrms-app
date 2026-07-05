import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../../config/database';
import { notifyUsers } from '../../services/notification.service';

// ── Validation ───────────────────────────────────────────────

const createHolidaySchema = z.object({
  name: z.string().min(1, 'Holiday name is required').max(200),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date'),
  isRestricted: z.boolean().optional().default(false),
});

const updateHolidaySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date').optional(),
  isRestricted: z.boolean().optional(),
});

// ── GET /api/holidays ────────────────────────────────────────
export const listHolidays = async (req: Request, res: Response): Promise<void> => {
  const year = parseInt(req.query.year as string) || new Date().getFullYear();

  const holidays = await prisma.holiday.findMany({
    where: { year },
    orderBy: { date: 'asc' },
  });

  res.json({ data: holidays });
};

// ── POST /api/holidays (admin) ───────────────────────────────
export const createHoliday = async (req: Request, res: Response): Promise<void> => {
  const parsed = createHolidaySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  const { name, date, isRestricted } = parsed.data;
  const dateObj = new Date(new Date(date).toISOString().split('T')[0]);
  const year = dateObj.getFullYear();

  // Check for duplicate date
  const existing = await prisma.holiday.findUnique({ where: { date: dateObj } });
  if (existing) {
    res.status(400).json({ error: { code: 'DUPLICATE_DATE', message: 'A holiday already exists on this date' } });
    return;
  }

  const holiday = await prisma.holiday.create({
    data: {
      name,
      date: dateObj,
      year,
      isRestricted,
    },
  });

  res.status(201).json({ data: holiday });

  // Notify all active employees about new holiday
  try {
    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE', userId: { not: null } },
      select: { userId: true },
    });
    const userIds = employees.map(e => e.userId).filter(Boolean) as string[];
    if (userIds.length > 0) {
      await notifyUsers({
        userIds,
        title: '🌴 New Holiday Added',
        message: `${name} has been added to the holiday calendar for ${dateObj.toLocaleDateString()}.`,
        type: 'SYSTEM',
        linkUrl: '/employee/dashboard',
      });
    }
  } catch (err) {
    console.error('Failed to send holiday notification', err);
  }
};

// ── PATCH /api/holidays/:id (admin) ──────────────────────────
export const updateHoliday = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const parsed = updateHolidaySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  const existing = await prisma.holiday.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Holiday not found' } });
    return;
  }

  let updateData: any = { ...parsed.data };
  
  if (parsed.data.date) {
    const dateObj = new Date(new Date(parsed.data.date).toISOString().split('T')[0]);
    updateData.date = dateObj;
    updateData.year = dateObj.getFullYear();
    
    const existingDate = await prisma.holiday.findUnique({ where: { date: dateObj } });
    if (existingDate && existingDate.id !== id) {
      res.status(400).json({ error: { code: 'DUPLICATE_DATE', message: 'A holiday already exists on this date' } });
      return;
    }
  }

  const updated = await prisma.holiday.update({
    where: { id },
    data: updateData,
  });

  res.json({ data: updated });
};

// ── DELETE /api/holidays/:id (admin) ─────────────────────────
export const deleteHoliday = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const holiday = await prisma.holiday.findUnique({ where: { id } });
  if (!holiday) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Holiday not found' } });
    return;
  }

  await prisma.holiday.delete({ where: { id } });
  res.json({ message: 'Holiday deleted successfully' });
};
