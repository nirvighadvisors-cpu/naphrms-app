import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from './env';

let io: Server | null = null;

// Map userId → Set of socket IDs (multi-device support)
const userSockets = new Map<string, Set<string>>();

interface JwtPayload {
  userId: string;
  role: string;
}

/** Parse a specific cookie value from a cookie header string */
function parseCookie(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader.split(';').find(c => c.trim().startsWith(`${name}=`));
  return match ? match.split('=').slice(1).join('=').trim() : undefined;
}

/**
 * Initialize Socket.IO server and attach it to the existing HTTP server.
 * Authenticates connections using JWT from the `auth.token` handshake param.
 */
export function initSocketIO(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: config.frontendUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/socket.io',
    transports: ['websocket', 'polling'],
  });

  // ── JWT Authentication Middleware ─────────────────────────
  io.use((socket: Socket, next) => {
    // Try handshake auth first, then fall back to cookie
    const token = socket.handshake.auth?.token || parseCookie(socket.handshake.headers.cookie, 'token');
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
      (socket as any).userId = decoded.userId;
      (socket as any).userRole = decoded.role;
      next();
    } catch (err) {
      return next(new Error('Invalid or expired token'));
    }
  });

  // ── Connection Handler ────────────────────────────────────
  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId as string;
    const userRole = (socket as any).userRole as string;

    // Register socket for this user (multi-device)
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);

    // Join a personal room for targeted notifications
    socket.join(`user:${userId}`);

    // Join role-based rooms for broadcast notifications
    socket.join(`role:${userRole}`);

    console.log(`[Socket.IO] User ${userId} connected (socket: ${socket.id}, role: ${userRole})`);

    // ── Disconnect Handler ────────────────────────────────
    socket.on('disconnect', () => {
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
        }
      }
      console.log(`[Socket.IO] User ${userId} disconnected (socket: ${socket.id})`);
    });
  });

  console.log('✅ Socket.IO initialized');
  return io;
}

/**
 * Get the Socket.IO server instance.
 * Throws if called before initSocketIO().
 */
export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.IO has not been initialized. Call initSocketIO() first.');
  }
  return io;
}

/**
 * Emit an event to a specific user (all their devices).
 */
export function emitToUser(userId: string, event: string, data: any): void {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}

/**
 * Emit an event to all users with a specific role (e.g., HR_ADMIN).
 */
export function emitToRole(role: string, event: string, data: any): void {
  if (!io) return;
  io.to(`role:${role}`).emit(event, data);
}

/**
 * Get the count of connected sockets for a user.
 */
export function getUserSocketCount(userId: string): number {
  return userSockets.get(userId)?.size || 0;
}
