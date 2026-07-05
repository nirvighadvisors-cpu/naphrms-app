import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/rbac.middleware';
import { getSettings, upsertSettings } from './settings.controller';

const router = Router();

router.use(authenticate);

// Employees can fetch (will only return isPublic settings)
// Admins can fetch all and upsert
router.get('/', getSettings);
router.post('/', requireAdmin, upsertSettings);

export default router;
