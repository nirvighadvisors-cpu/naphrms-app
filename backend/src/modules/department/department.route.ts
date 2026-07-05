import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/rbac.middleware';
import {
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from './department.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', listDepartments);
router.post('/', requireAdmin, createDepartment);
router.patch('/:id', requireAdmin, updateDepartment);
router.delete('/:id', requireAdmin, deleteDepartment);

export default router;
