import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import prisma from '../config/database';

export interface JwtPayload {
  userId: string;
  role: string;
  employeeId?: string;
}

// Extend Express Request to include user data
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Verify JWT token from httpOnly cookie and attach user data to request.
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }

    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, status: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Account is not active' } });
      return;
    }

    // Look up the linked employee record (if any)
    let employeeId: string | undefined = decoded.employeeId;
    if (!employeeId && user.role === 'EMPLOYEE') {
      const employee = await prisma.employee.findFirst({
        where: { userId: decoded.userId },
        select: { id: true },
      });
      employeeId = employee?.id;
    }

    req.user = { ...decoded, employeeId };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: { code: 'TOKEN_EXPIRED', message: 'Session expired. Please login again.' } });
      return;
    }
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid authentication token' } });
  }
};
