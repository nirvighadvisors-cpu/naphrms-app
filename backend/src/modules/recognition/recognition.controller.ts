import { Request, Response } from 'express';
import prisma from '../../config/database';
import {
  createBadgeSchema,
  updateBadgeSchema,
  sendRecognitionSchema,
} from './recognition.validation';
import { notifyUsers } from '../../services/notification.service';

// ── GET /api/recognition/badges ──────────────────────────────
export const getBadges = async (req: Request, res: Response): Promise<void> => {
  const { includeInactive } = req.query;
  const where = includeInactive === 'true' && req.user?.role === 'ADMIN' ? {} : { isActive: true };

  const badges = await prisma.badge.findMany({
    where,
    orderBy: { name: 'asc' },
  });

  res.json({ data: badges });
};

// ── POST /api/recognition/badges (admin) ────────────────────
export const createBadge = async (req: Request, res: Response): Promise<void> => {
  const parsed = createBadgeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  const badge = await prisma.badge.create({
    data: parsed.data,
  });

  res.status(201).json({ data: badge });
};

// ── PATCH /api/recognition/badges/:id (admin) ───────────────
export const updateBadge = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const parsed = updateBadgeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  try {
    const badge = await prisma.badge.update({
      where: { id },
      data: parsed.data,
    });
    res.json({ data: badge });
  } catch (err) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Badge not found' } });
  }
};

// ── GET /api/recognition/feed ───────────────────────────────
export const getRecognitionFeed = async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  // For employees, only show public recognitions or ones they sent/received.
  const role = req.user?.role;
  const employeeId = req.user?.employeeId; // Might be undefined if user has no employee record (e.g. some admins)

  let where = {};
  if (role === 'EMPLOYEE' && employeeId) {
    where = {
      OR: [
        { isPublic: true },
        { senderId: employeeId },
        { receiverId: employeeId }
      ]
    };
  }

  const [records, total] = await Promise.all([
    prisma.recognition.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        badge: true,
        sender: { select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true, department: { select: { name: true } } } },
        receiver: { select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true, department: { select: { name: true } } } },
      },
    }),
    prisma.recognition.count({ where }),
  ]);

  res.json({
    data: records,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
};

// ── POST /api/recognition/send ──────────────────────────────
export const sendRecognition = async (req: Request, res: Response): Promise<void> => {
  const parsed = sendRecognitionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  const { receiverId, badgeId, message, isPublic } = parsed.data;
  
  // Find sender employee ID
  const sender = await prisma.employee.findUnique({ where: { userId: req.user!.userId } });
  if (!sender) {
    res.status(404).json({ error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Sender employee record not found' } });
    return;
  }

  if (sender.id === receiverId) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'You cannot send recognition to yourself' } });
    return;
  }

  const recognition = await prisma.recognition.create({
    data: {
      senderId: sender.id,
      receiverId,
      badgeId,
      message,
      isPublic,
    },
    include: {
      badge: true,
      sender: { select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true } },
      receiver: { select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true } },
    }
  });

  res.status(201).json({ data: recognition });

  // Notify Receiver
  try {
    const targetEmployee = await prisma.employee.findUnique({
      where: { id: receiverId },
      select: { userId: true },
    });
    if (targetEmployee?.userId) {
      await notifyUsers({
        userIds: [targetEmployee.userId],
        title: `🏆 New Recognition: ${recognition.badge.name}`,
        message: `${sender.firstName} ${sender.lastName} recognized you: "${message}"`,
        type: 'SYSTEM',
        linkUrl: '/employee/dashboard',
      });
    }
  } catch (err) {
    console.error('Failed to send recognition notification', err);
  }
};
