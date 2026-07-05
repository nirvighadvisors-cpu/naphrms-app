import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/rbac.middleware';
import {
  listWorkSites,
  createWorkSite,
  updateWorkSite,
  deleteWorkSite,
} from './worksite.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', listWorkSites);
router.post('/', requireAdmin, createWorkSite);
router.patch('/:id', requireAdmin, updateWorkSite);
router.delete('/:id', requireAdmin, deleteWorkSite);

export default router;
