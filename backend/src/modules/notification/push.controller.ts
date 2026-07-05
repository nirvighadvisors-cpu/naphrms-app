import { Request, Response } from 'express';
import prisma from '../../config/database';
import { config } from '../../config/env';

// ── GET /api/push/vapid-key ─────────────────────────────────
// Returns the public VAPID key so the frontend can subscribe
export const getVapidKey = async (_req: Request, res: Response): Promise<void> => {
  res.json({ data: { publicKey: config.vapidPublicKey } });
};

// ── POST /api/push/subscribe ────────────────────────────────
// Save or update a push subscription for the authenticated user
export const subscribe = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { endpoint, keys } = req.body;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({
      error: { code: 'BAD_REQUEST', message: 'Invalid push subscription data. Required: endpoint, keys.p256dh, keys.auth' },
    });
    return;
  }

  try {
    // Upsert: if the same endpoint already exists, update it
    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId, // Re-associate if a different user logs in on the same browser
        userAgent: req.headers['user-agent'] || null,
      },
      create: {
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: req.headers['user-agent'] || null,
      },
    });

    res.status(201).json({ data: subscription, message: 'Push subscription saved' });
  } catch (error: any) {
    console.error('[Push] Failed to save subscription:', error.message);
    res.status(500).json({ error: { code: 'SUBSCRIBE_FAILED', message: 'Failed to save push subscription' } });
  }
};

// ── DELETE /api/push/unsubscribe ─────────────────────────────
// Remove a push subscription
export const unsubscribe = async (req: Request, res: Response): Promise<void> => {
  const { endpoint } = req.body;

  if (!endpoint) {
    res.status(400).json({
      error: { code: 'BAD_REQUEST', message: 'Endpoint is required' },
    });
    return;
  }

  try {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId: req.user!.userId },
    });

    res.json({ message: 'Push subscription removed' });
  } catch (error: any) {
    console.error('[Push] Failed to remove subscription:', error.message);
    res.status(500).json({ error: { code: 'UNSUBSCRIBE_FAILED', message: 'Failed to remove push subscription' } });
  }
};
