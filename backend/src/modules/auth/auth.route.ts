import { Router } from 'express';
import { login, getMe, logout, activateAccount, forgotPassword, resetPassword } from './auth.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authLimiter } from '../../middleware/rate-limiter.middleware';

const router = Router();

// Public routes — rate-limited to prevent brute force
router.post('/login', authLimiter, login);
router.post('/logout', logout);
router.post('/activate', authLimiter, activateAccount);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);

// Protected routes
router.get('/me', authenticate, getMe);

export default router;
