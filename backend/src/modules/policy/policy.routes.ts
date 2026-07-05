import { Router } from 'express';
import { uploadPolicy, getPolicies, deletePolicy, getMergedPolicies } from './policy.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Public/Auth endpoint for merged policies
router.get('/merged', getMergedPolicies);

// Admin only endpoints
router.get('/', authenticate, requireRole(['HR_ADMIN']), getPolicies);
router.post('/', authenticate, requireRole(['HR_ADMIN']), upload.single('file'), uploadPolicy);
router.delete('/:id', authenticate, requireRole(['HR_ADMIN']), deletePolicy);

export default router;
