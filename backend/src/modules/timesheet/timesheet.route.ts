import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/rbac.middleware';
import { submitDailyLog, getMyLogs, getAllLogs } from './timesheet.controller';

const router = Router();

router.use(authenticate);

// Employee actions
router.post('/', submitDailyLog);
router.get('/my', getMyLogs);

// Admin actions
router.get('/all', requireAdmin, getAllLogs);

export default router;
