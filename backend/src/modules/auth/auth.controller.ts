import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database';
import { config } from '../../config/env';
import { sendEmail } from '../../lib/email';

// ── Strong Password Regex ───────────────────────────────────
// At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#()_\-+=[\]{}|;:'",.<>/\\`~])[A-Za-z\d@$!%*?&^#()_\-+=[\]{}|;:'",.<>/\\`~]{8,}$/;

const strongPasswordMessage =
  'Password must be at least 8 characters and contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character';

// ── Validation Schemas ──────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ── Helper ──────────────────────────────────────────────────
const generateToken = (userId: string, role: string) => {
  return jwt.sign({ userId, role }, config.jwtSecret as string, {
    expiresIn: config.jwtExpiry as any,
  });
};

const setTokenCookie = (res: Response, token: string) => {
  // Convert something like "8h" or "7d" to milliseconds for cookie maxAge
  const isDays = config.jwtExpiry.endsWith('d');
  const isHours = config.jwtExpiry.endsWith('h');
  const num = parseInt(config.jwtExpiry);

  let maxAge = 8 * 60 * 60 * 1000; // Default 8 hours
  if (isDays) maxAge = num * 24 * 60 * 60 * 1000;
  if (isHours) maxAge = num * 60 * 60 * 1000;

  res.cookie('token', token, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
    maxAge,
    path: '/',
    ...(config.cookieDomain ? { domain: config.cookieDomain } : {}),
  });
};

// ── Controllers ─────────────────────────────────────────────

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
            isProfileComplete: true,
          },
        },
      },
    });

    // ── Check 1: User exists ────────────────────────────────
    if (!user) {
      // Generic message to prevent email enumeration
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // ── Check 2: Account lockout ────────────────────────────
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      res.status(423).json({
        error: `Account is locked due to too many failed login attempts. Try again in ${minutesLeft} minute(s).`,
        code: 'ACCOUNT_LOCKED',
        lockedUntil: user.lockedUntil.toISOString(),
      });
      return;
    }

    // If lockout has expired, auto-unlock the account
    if (user.lockedUntil && user.lockedUntil <= new Date()) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          status: 'ACTIVE',
          loginAttempts: 0,
          lockedUntil: null,
        },
      });
    }

    // ── Check 3: Account status ─────────────────────────────
    if (user.status === 'INACTIVE') {
      res.status(401).json({ error: 'Your account has been deactivated. Please contact your HR administrator.' });
      return;
    }

    if (user.status === 'INVITED') {
      res.status(401).json({ error: 'Please activate your account first using the link sent to your email.' });
      return;
    }

    if (!user.passwordHash) {
      res.status(401).json({ error: 'Please activate your account first using the link sent to your email.' });
      return;
    }

    // ── Check 4: Password verification ──────────────────────
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      // Increment failed attempts
      const newAttempts = (user.loginAttempts || 0) + 1;
      const shouldLock = newAttempts >= config.maxLoginAttempts;

      const updateData: any = {
        loginAttempts: newAttempts,
      };

      if (shouldLock) {
        const lockoutDuration = config.lockoutDurationMinutes * 60 * 1000;
        updateData.lockedUntil = new Date(Date.now() + lockoutDuration);
        updateData.status = 'LOCKED';
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      // If account just got locked, send a security alert email
      if (shouldLock) {
        sendEmail({
          to: user.email,
          subject: '⚠️ Security Alert: Your Account Has Been Locked',
          html: `
            <h2>Account Security Alert</h2>
            <p>Your NAP HRMS account has been <strong>temporarily locked</strong> due to ${config.maxLoginAttempts} consecutive failed login attempts.</p>
            <p>Your account will be automatically unlocked after <strong>${config.lockoutDurationMinutes} minutes</strong>.</p>
            <p>If this was not you, please contact your HR administrator immediately.</p>
            <p style="color: #666; font-size: 12px;">IP Address: ${req.ip || 'unknown'}</p>
          `,
        });

        res.status(423).json({
          error: `Account has been locked due to ${config.maxLoginAttempts} failed login attempts. Try again in ${config.lockoutDurationMinutes} minutes. A security alert email has been sent.`,
          code: 'ACCOUNT_LOCKED',
        });
        return;
      }

      const remaining = config.maxLoginAttempts - newAttempts;
      res.status(401).json({
        error: `Invalid email or password. ${remaining} attempt(s) remaining before your account is locked.`,
      });
      return;
    }

    // ── Success: Reset lockout counters & update last login ──
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        loginAttempts: 0,
        lockedUntil: null,
        status: user.status === 'LOCKED' ? 'ACTIVE' : user.status,
      },
    });

    const token = generateToken(user.id, user.role);
    setTokenCookie(res, token);

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        employeeId: user.employee?.id,
        firstName: user.employee?.firstName,
        lastName: user.employee?.lastName,
        profilePhotoUrl: user.employee?.profilePhotoUrl,
        isProfileComplete: user.employee?.isProfileComplete ?? true,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: (error as any).errors });
      return;
    }
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // req.user is set by the requireAuth middleware
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
            isProfileComplete: true,
            profileCompletedAt: true,
            probationEndsAt: true,
          },
        },
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      res.clearCookie('token', {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
        path: '/',
        ...(config.cookieDomain ? { domain: config.cookieDomain } : {}),
      });
      res.status(401).json({ error: 'User not found or inactive' });
      return;
    }

    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        employeeId: user.employee?.id,
        firstName: user.employee?.firstName,
        lastName: user.employee?.lastName,
        profilePhotoUrl: user.employee?.profilePhotoUrl,
        isProfileComplete: user.employee?.isProfileComplete ?? true,
        profileCompletedAt: user.employee?.profileCompletedAt,
        probationEndsAt: user.employee?.probationEndsAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── Activate Account ────────────────────────────────────────
const activateSchema = z.object({
  token: z.string().min(1, 'Activation token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(strongPasswordRegex, strongPasswordMessage),
});

export const activateAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = activateSchema.parse(req.body);

    // 1. Find the user by invite token
    const user = await prisma.user.findFirst({
      where: { inviteToken: token },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
            isProfileComplete: true,
          },
        },
      },
    });

    if (!user) {
      res.status(400).json({ error: 'Invalid or expired activation link. Please contact your HR administrator for a new invitation.' });
      return;
    }

    // 2. Check the token has not expired
    if (user.inviteExpiresAt && new Date() > user.inviteExpiresAt) {
      res.status(400).json({ error: 'This activation link has expired. Please contact your HR administrator for a new invitation.' });
      return;
    }

    // 3. Check user is still in INVITED status (prevent re-use)
    if (user.status !== 'INVITED') {
      res.status(400).json({ error: 'This account has already been activated. Please use the login page.' });
      return;
    }

    // 4. Hash the new password
    const passwordHash = await bcrypt.hash(password, config.bcryptSaltRounds);

    // 5. Update user: set password, mark ACTIVE, clear token (single-use)
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        status: 'ACTIVE',
        inviteToken: null,
        inviteExpiresAt: null,
        lastLoginAt: new Date(),
        loginAttempts: 0,
        lockedUntil: null,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
            isProfileComplete: true,
          },
        },
      },
    });

    // 6. Auto-login: generate JWT and set cookie
    const jwtToken = generateToken(updatedUser.id, updatedUser.role);
    setTokenCookie(res, jwtToken);

    res.status(200).json({
      message: 'Account activated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        employeeId: updatedUser.employee?.id,
        firstName: updatedUser.employee?.firstName,
        lastName: updatedUser.employee?.lastName,
        profilePhotoUrl: updatedUser.employee?.profilePhotoUrl,
        isProfileComplete: updatedUser.employee?.isProfileComplete ?? false,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: (error as any).errors });
      return;
    }
    next(error);
  }
};

export const logout = (req: Request, res: Response) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
    path: '/',
    ...(config.cookieDomain ? { domain: config.cookieDomain } : {}),
  });
  res.status(200).json({ message: 'Logged out successfully' });
};

// ── Forgot Password ───────────────────────────────────────────
const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ error: { message: 'This email address is not registered in the system.' } });
      return;
    }

    // Generate a secure reset token
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        inviteToken: resetToken,
        inviteExpiresAt: expiresAt,
      },
    });

    const resetLink = `${config.appUrl}/reset-password?token=${resetToken}`;
    sendEmail({
      to: user.email,
      subject: 'Password Reset Request — NAP HRMS',
      html: `
        <h2>Password Reset Request</h2>
        <p>You recently requested to reset your password for your NAP HRMS account.</p>
        <p>Click the button below to set a new password. This link will expire in <strong>1 hour</strong>.</p>
        <a href="${resetLink}" style="display:inline-block;padding:12px 24px;background-color:#01696f;color:white;text-decoration:none;border-radius:6px;font-weight:600;">Reset Password</a>
        <p style="color:#888;font-size:12px;margin-top:20px;">If you did not request a password reset, please ignore this email or contact your HR administrator.</p>
      `,
    });

    // In dev mode, log token to console for easy testing
    if (config.nodeEnv !== 'production') {
      console.log(`[DEV] Password reset token for ${email}: ${resetToken}`);
    }

    res.status(200).json({ message: 'If an account exists, a reset link has been sent.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: (error as any).errors });
      return;
    }
    next(error);
  }
};

// ── Reset Password ────────────────────────────────────────────
const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(strongPasswordRegex, strongPasswordMessage),
});

export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { inviteToken: token } });

    if (!user || !user.inviteExpiresAt || user.inviteExpiresAt < new Date()) {
      res.status(400).json({ error: { code: 'INVALID_TOKEN', message: 'The reset link is invalid or has expired' } });
      return;
    }

    const passwordHash = await bcrypt.hash(password, config.bcryptSaltRounds);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        inviteToken: null,
        inviteExpiresAt: null,
        status: user.status === 'INVITED' ? 'ACTIVE' : user.status,
        loginAttempts: 0,
        lockedUntil: null,
      },
    });

    res.status(200).json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: (error as any).errors });
      return;
    }
    next(error);
  }
};
