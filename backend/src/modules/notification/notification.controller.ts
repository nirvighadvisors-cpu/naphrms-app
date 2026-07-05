import { Request, Response } from 'express';
import prisma from '../../config/database';
import { dateRangeQuerySchema } from './notification.validation';

// ── GET /api/notifications ──────────────────────────────────
export const getMyNotifications = async (req: Request, res: Response): Promise<void> => {
  const queryParsed = dateRangeQuerySchema.safeParse(req.query);
  if (!queryParsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid query', details: queryParsed.error.flatten() } });
    return;
  }

  const { page = 1, limit = 20 } = queryParsed.data;
  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: req.user!.userId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notification.count({ where: { userId: req.user!.userId } }),
  ]);

  res.json({
    data: notifications,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
};

// ── GET /api/notifications/unread-count ──────────────────────
export const getUnreadCount = async (req: Request, res: Response): Promise<void> => {
  const count = await prisma.notification.count({
    where: { 
      userId: req.user!.userId,
      isRead: false 
    },
  });

  res.json({ data: { count } });
};

// ── PATCH /api/notifications/:id/read ────────────────────────
export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const notification = await prisma.notification.findUnique({ where: { id } });

  if (!notification) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Notification not found' } });
    return;
  }

  if (notification.userId !== req.user!.userId) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
    return;
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });

  res.json({ data: updated });
};

// ── PATCH /api/notifications/read-all ────────────────────────
export const markAllAsRead = async (req: Request, res: Response): Promise<void> => {
  await prisma.notification.updateMany({
    where: { 
      userId: req.user!.userId,
      isRead: false 
    },
    data: { isRead: true },
  });

  res.json({ message: 'All notifications marked as read' });
};
