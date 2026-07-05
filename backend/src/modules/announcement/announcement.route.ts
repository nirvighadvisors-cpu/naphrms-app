import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import {
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  listAnnouncementsAdmin,
  getActiveAnnouncements,
  markAnnouncementRead,
  getTeamUpdates,
  getMyLatestPayslip,
} from './announcement.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ── Employee Routes ─────────────────────────────────────────
router.get('/active', getActiveAnnouncements);
router.post('/:id/read', markAnnouncementRead);

// ── Dashboard Endpoints ─────────────────────────────────────
router.get('/team-updates', getTeamUpdates);
router.get('/my-latest-payslip', getMyLatestPayslip);

// ── Admin Routes ────────────────────────────────────────────
router.get('/admin', listAnnouncementsAdmin);
router.post('/', createAnnouncement);
router.patch('/:id', updateAnnouncement);
router.delete('/:id', deleteAnnouncement);

export default router;
