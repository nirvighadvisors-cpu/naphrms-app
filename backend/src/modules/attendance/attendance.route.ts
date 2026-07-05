import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/rbac.middleware';
import {
  punchIn,
  punchOut,
  extendPunchOut,
  getToday,
  getMyAttendance,
  getAllAttendance,
  getAttendanceSummary,
  markAttendance,
  createRegularization,
  reviewRegularization,
  getPendingRegularizations,
  getAnalytics,
} from './attendance.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ── Employee routes ──────────────────────────────────────────
router.post('/punch-in', punchIn);
router.post('/punch-out', punchOut);
router.post('/extend', extendPunchOut);
router.get('/today', getToday);
router.get('/my', getMyAttendance);
router.get('/analytics', getAnalytics);
router.post('/regularize', createRegularization);

// ── Admin routes ─────────────────────────────────────────────
router.get('/summary', requireAdmin, getAttendanceSummary);
router.get('/regularizations', requireAdmin, getPendingRegularizations);
router.post('/mark', requireAdmin, markAttendance);
router.patch('/regularize/:id', requireAdmin, reviewRegularization);

// Admin list — placed last so '/summary', '/regularizations' etc. are matched first
router.get('/', requireAdmin, getAllAttendance);

export default router;
