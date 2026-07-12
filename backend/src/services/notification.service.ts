import webpush from 'web-push';
import prisma from '../config/database';
import { config } from '../config/env';
import { emitToUser, emitToRole } from '../config/socket';
import type { NotifType } from '@prisma/client';

// ── Configure Web Push with VAPID Keys ──────────────────────
if (config.vapidPublicKey && config.vapidPrivateKey) {
  webpush.setVapidDetails(
    config.vapidSubject,
    config.vapidPublicKey,
    config.vapidPrivateKey
  );
  console.log('✅ Web Push (VAPID) configured');
}

// ── Types ────────────────────────────────────────────────────

export interface SendNotificationOptions {
  /** The user to send the notification to */
  userId: string;
  /** Notification title */
  title: string;
  /** Notification body message */
  message: string;
  /** Notification type from the NotifType enum */
  type: NotifType;
  /** Optional deep-link URL within the app */
  linkUrl?: string;
  /** Optional icon for push notification */
  icon?: string;
}

export interface BroadcastNotificationOptions {
  /** Role to broadcast to (e.g., 'HR_ADMIN') */
  role: string;
  /** Array of userIds with this role (for DB + push) */
  userIds: string[];
  /** Notification title */
  title: string;
  /** Notification body message */
  message: string;
  /** Notification type */
  type: NotifType;
  /** Optional deep-link URL */
  linkUrl?: string;
}

// ── Notification Service ─────────────────────────────────────

/**
 * Send a notification to a single user.
 * 1. Creates the notification record in the database.
 * 2. Emits a Socket.IO event for real-time in-app update.
 * 3. Sends Web Push to all of the user's subscribed devices.
 */
export async function sendNotification(options: SendNotificationOptions) {
  const { userId, title, message, type, linkUrl } = options;

  // 1. Save to database
  const notification = await prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type,
      isRead: false,
      linkUrl,
    },
  });

  // 2. Emit via Socket.IO (real-time in-app)
  emitToUser(userId, 'notification:new', notification);

  // 3. Send Web Push to all subscribed devices
  await sendWebPushToUser(userId, {
    title,
    body: message,
    icon: options.icon || '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: {
      url: linkUrl || '/',
      notificationId: notification.id,
    },
  });

  return notification;
}

/**
 * Send a notification to all users with a specific role.
 * Creates individual DB records for each user, emits via Socket.IO room,
 * and sends Web Push to all subscribed devices of those users.
 */
export async function broadcastToRole(options: BroadcastNotificationOptions) {
  const { role, userIds, title, message, type, linkUrl } = options;

  if (userIds.length === 0) return;

  // 1. Create DB records for each user
  const notifications = await prisma.notification.createManyAndReturn({
    data: userIds.map(userId => ({
      userId,
      title,
      message,
      type,
      isRead: false,
      linkUrl,
    })),
  });

  // 2. Emit via Socket.IO to the role room (instant for all connected users)
  emitToRole(role, 'notification:new', {
    title,
    message,
    type,
    linkUrl,
    createdAt: new Date().toISOString(),
  });

  // 3. Send Web Push to all users' devices
  const pushPayload = {
    title,
    body: message,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: { url: linkUrl || '/' },
  };

  await Promise.allSettled(
    userIds.map(userId => sendWebPushToUser(userId, pushPayload))
  );

  return notifications;
}

export interface NotifyUsersOptions {
  userIds: string[];
  title: string;
  message: string;
  type: NotifType;
  linkUrl?: string;
}

/**
 * Send a notification to a specific list of users.
 */
export async function notifyUsers(options: NotifyUsersOptions) {
  const { userIds, title, message, type, linkUrl } = options;
  if (userIds.length === 0) return;

  const validUserIds = [...new Set(userIds.filter(id => id))];

  // 1. Create DB records
  const notifications = await prisma.notification.createManyAndReturn({
    data: validUserIds.map(userId => ({
      userId,
      title,
      message,
      type,
      isRead: false,
      linkUrl,
    })),
  });

  // 2. Emit via Socket.IO
  validUserIds.forEach((userId, index) => {
    emitToUser(userId, 'notification:new', notifications[index]);
  });

  // 3. Send Web Push
  const pushPayload = {
    title,
    body: message,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: { url: linkUrl || '/' },
  };

  await Promise.allSettled(
    validUserIds.map(userId => sendWebPushToUser(userId, pushPayload))
  );

  return notifications;
}

/**
 * Send Web Push notification to all subscribed devices of a user.
 * Automatically cleans up expired/invalid subscriptions.
 */
async function sendWebPushToUser(userId: string, payload: any) {
  if (!config.vapidPublicKey || !config.vapidPrivateKey) {
    return; // Web Push not configured
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) return;

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          JSON.stringify(payload)
        );
        console.log(`[Push] Sent to user ${userId} on ${sub.endpoint.slice(0, 50)}...`);
      } catch (error: any) {
        // If subscription is expired or invalid (410 Gone, 404 Not Found), remove it
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`[Push] Removing expired subscription for user ${userId}: ${sub.endpoint.slice(0, 50)}...`);
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        } else {
          console.error(`[Push] Failed to send to user ${userId}:`, error.message);
        }
      }
    })
  );

  return results;
}

// ── Helper: Get all HR Admin user IDs ────────────────────────
export async function getHRAdminUserIds(): Promise<string[]> {
  const admins = await prisma.user.findMany({
    where: { role: 'HR_ADMIN', status: 'ACTIVE' },
    select: { id: true },
  });
  return admins.map(a => a.id);
}

// ── Helper: Get employee's manager's userId ──────────────────
export async function getManagerUserId(employeeId: string): Promise<string | null> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      manager: {
        select: { userId: true },
      },
    },
  });
  return employee?.manager?.userId || null;
}

// ── Helper: Get userId from employeeId ───────────────────────
export async function getUserIdFromEmployeeId(employeeId: string): Promise<string | null> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { userId: true },
  });
  return employee?.userId || null;
}

// ── Helper: Get employee name from employeeId ────────────────
export async function getEmployeeName(employeeId: string): Promise<string> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { firstName: true, lastName: true },
  });
  return employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee';
}
