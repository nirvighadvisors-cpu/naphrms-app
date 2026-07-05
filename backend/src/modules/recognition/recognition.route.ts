import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/rbac.middleware';
import {
  getBadges,
  createBadge,
  updateBadge,
  getRecognitionFeed,
  sendRecognition,
} from './recognition.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ── Badges ───────────────────────────────────────────────────
router.get('/badges', getBadges);
router.post('/badges', requireAdmin, createBadge);
router.patch('/badges/:id', requireAdmin, updateBadge);

// ── Feed & Sending ───────────────────────────────────────────
router.get('/feed', getRecognitionFeed);
router.post('/send', sendRecognition);

export default router;
