import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/rbac.middleware';
import { getDashboardStats, getDepartmentDistribution, getExpenseTrends } from './report.controller';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

// Analytics endpoints
router.get('/dashboard-stats', getDashboardStats);
router.get('/department-distribution', getDepartmentDistribution);
router.get('/expense-trends', getExpenseTrends);

export default router;
