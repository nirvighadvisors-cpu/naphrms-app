import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';

/**
 * Middleware factory: logs actions to the AuditLog table.
 * Usage: auditAction('EMPLOYEE_CREATED', 'Employee')
 */
export const auditAction = (action: string, targetType?: string) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    // Audit logging runs after the response is sent (non-blocking)
    const originalSend = _res.send.bind(_res);

    _res.send = function (body: any) {
      // Only log successful operations
      if (_res.statusCode >= 200 && _res.statusCode < 400 && req.user) {
        // Fire and forget — don't block the response
        prisma.auditLog
          .create({
            data: {
              userId: req.user.userId,
              action,
              targetId: (req.params.id as string) || undefined,
              targetType: targetType || undefined,
              details: {
                method: req.method,
                path: req.originalUrl,
                statusCode: _res.statusCode,
              },
              ipAddress: req.ip || req.socket.remoteAddress || undefined,
              userAgent: req.headers['user-agent'] || undefined,
              status: 'SUCCESS',
            },
          })
          .catch((err) => {
            console.error('Audit log failed:', err.message);
          });
      }

      return originalSend(body);
    };

    next();
  };
};

/**
 * Utility function: create an audit log entry directly.
 */
export async function createAuditLog(params: {
  userId: string;
  action: string;
  targetId?: string;
  targetType?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        targetId: params.targetId,
        targetType: params.targetType,
        details: params.details || {},
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        status: 'SUCCESS',
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}
