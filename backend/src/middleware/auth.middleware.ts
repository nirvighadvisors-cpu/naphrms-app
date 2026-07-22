import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import prisma from '../config/database';
import { generateToken, setTokenCookie } from '../modules/auth/auth.controller';

export interface JwtPayload {
  userId: string;
  role: string;
  employeeId?: string;
  tokenVersion?: number;
  iat?: number;
  exp?: number;
}

// Extend Express Request to include user data
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// ── Constants ────────────────────────────────────────────────
const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000; // 24 hours after expiry
const REFRESH_THRESHOLD = 0.5; // Refresh token after 50% of lifetime has elapsed

/**
 * Verify JWT token from httpOnly cookie and attach user data to request.
 * Implements:
 * - Sliding session: auto-refreshes JWT when past half its lifetime
 * - Grace period: accepts recently-expired tokens (within 24h) and reissues
 * - tokenVersion: rejects tokens from before a logout/password change
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

    let decoded: JwtPayload;
    let isExpiredButInGrace = false;

    try {
      // Try to verify normally
      decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        // Check if the token expired within the grace period
        const decodedExpired = jwt.decode(token) as JwtPayload;
        if (!decodedExpired || !decodedExpired.exp) {
          res.status(401).json({ error: { code: 'TOKEN_EXPIRED', message: 'Session expired. Please login again.' } });
          return;
        }

        const expiredAtMs = decodedExpired.exp * 1000;
        const now = Date.now();

        if (now - expiredAtMs <= GRACE_PERIOD_MS) {
          // Within grace period — allow through and reissue token
          decoded = decodedExpired;
          isExpiredButInGrace = true;
        } else {
          // Too long ago — force re-login
          res.status(401).json({ error: { code: 'TOKEN_EXPIRED', message: 'Session expired. Please login again.' } });
          return;
        }
      } else {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid authentication token' } });
        return;
      }
    }

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, status: true, tokenVersion: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Account is not active' } });
      return;
    }

    // ── tokenVersion check ────────────────────────────────
    // If the token's version doesn't match the DB, the user has logged out,
    // changed their password, or their account was modified — reject.
    if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== user.tokenVersion) {
      res.status(401).json({ error: { code: 'SESSION_INVALIDATED', message: 'Session has been invalidated. Please login again.' } });
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

    // ── Sliding session refresh ────────────────────────────
    // If the token is past half its lifetime, or was in the grace period,
    // silently issue a fresh token so the session keeps extending.
    let shouldRefresh = isExpiredButInGrace;

    if (!shouldRefresh && decoded.iat && decoded.exp) {
      const totalLifetime = (decoded.exp - decoded.iat) * 1000;
      const elapsed = Date.now() - (decoded.iat * 1000);
      if (elapsed > totalLifetime * REFRESH_THRESHOLD) {
        shouldRefresh = true;
      }
    }

    if (shouldRefresh) {
      try {
        const freshToken = generateToken(user.id, user.role, user.tokenVersion);
        setTokenCookie(res, freshToken);
      } catch (e) {
        // Non-fatal — the request still proceeds with the old token
        console.error('Failed to refresh token:', e);
      }
    }

    next();
  } catch (error) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid authentication token' } });
  }
};
