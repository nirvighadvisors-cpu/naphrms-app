import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/rbac.middleware';
import { auditAction } from '../../middleware/audit.middleware';
import {
  listHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
} from './holiday.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', listHolidays);
router.post('/', requireAdmin, auditAction('HOLIDAY_CREATED', 'Holiday'), createHoliday);
router.patch('/:id', requireAdmin, auditAction('HOLIDAY_UPDATED', 'Holiday'), updateHoliday);
router.delete('/:id', requireAdmin, auditAction('HOLIDAY_DELETED', 'Holiday'), deleteHoliday);

export default router;
