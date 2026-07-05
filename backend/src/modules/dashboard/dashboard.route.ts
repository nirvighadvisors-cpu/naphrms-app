import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { getActionItems } from './dashboard.controller';

const router = Router();

// Middleware
router.use(authenticate);

router.get('/action-items', getActionItems);

export default router;
