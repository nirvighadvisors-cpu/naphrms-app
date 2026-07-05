import { Request, Response, NextFunction } from 'express';
import { ROLE_PERMISSIONS, Permission } from '../config/permissions';

/**
 * Middleware factory: checks if the current user's role has the required permission.
 */
export const requirePermission = (permission: Permission) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }

    const userPermissions = ROLE_PERMISSIONS[req.user.role] || [];

    if (!userPermissions.includes(permission)) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to perform this action',
        },
      });
      return;
    }

    next();
  };
};

/**
 * Middleware: requires the user to have the HR_ADMIN role.
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role !== 'HR_ADMIN') {
    res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Admin access required',
      },
    });
    return;
  }
  next();
};

/**
 * Middleware: requires the user to have one of the specified roles.
 */
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have the required role to perform this action',
        },
      });
      return;
    }
    next();
  };
};
