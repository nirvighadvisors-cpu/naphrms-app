import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/rbac.middleware';
import {
  createCycle,
  getCycles,
  getActiveCycle,
  updateCycleStatus,
  createGoal,
  getMyGoals,
  updateGoalProgress,
  getMyReview,
  submitSelfReview,
  getAllReviews,
  submitHrReview,
  getPerformanceSummary,
} from './performance.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ── Admin: Review Cycles & Summary ───────────────────────────
router.post('/cycles', requireAdmin, createCycle);
router.patch('/cycles/:id/status', requireAdmin, updateCycleStatus);
router.get('/summary', requireAdmin, getPerformanceSummary);
router.get('/reviews', requireAdmin, getAllReviews);
router.patch('/reviews/:id/hr', requireAdmin, submitHrReview);

// ── Shared: Cycles ───────────────────────────────────────────
router.get('/cycles/active', getActiveCycle);
router.get('/cycles', getCycles);

// ── Employee: Goals ──────────────────────────────────────────
router.post('/goals', createGoal);
router.get('/goals/my', getMyGoals);
router.patch('/goals/:id/progress', updateGoalProgress);

// ── Employee: Reviews ────────────────────────────────────────
router.get('/reviews/my/:cycleId', getMyReview);
router.patch('/reviews/my/:cycleId', submitSelfReview);

export default router;
