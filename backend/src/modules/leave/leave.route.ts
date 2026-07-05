import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/rbac.middleware';
import {
  getLeaveTypes,
  createLeaveType,
  updateLeaveType,
  deleteLeaveType,
  getMyBalances,
  getAllBalances,
  initializeBalances,
  applyLeave,
  getMyLeaves,
  getAllLeaveRequests,
  reviewLeave,
  cancelLeave,
  getLeaveSummary,
  uploadLeaveDocument,
  uploadLeaveAttachment,
} from './leave.controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } }); // 2MB limit

// All routes require authentication
router.use(authenticate);

// ── Leave Type routes ────────────────────────────────────────
router.get('/types', getLeaveTypes);
router.post('/types', requireAdmin, createLeaveType);
router.patch('/types/:id', requireAdmin, updateLeaveType);
router.delete('/types/:id', requireAdmin, deleteLeaveType);

// ── Balance routes ───────────────────────────────────────────
router.get('/balances/my', getMyBalances);
router.get('/balances', requireAdmin, getAllBalances);
router.post('/balances/initialize', requireAdmin, initializeBalances);

// ── Leave Request routes ─────────────────────────────────────
router.post('/apply', applyLeave);
router.get('/my', getMyLeaves);
router.get('/requests', requireAdmin, getAllLeaveRequests);
router.patch('/requests/:id/review', requireAdmin, reviewLeave);
router.patch('/requests/:id/cancel', cancelLeave);
router.patch('/requests/:id/document', uploadLeaveDocument);
router.post('/upload-attachment', upload.single('file'), uploadLeaveAttachment);
router.get('/summary', requireAdmin, getLeaveSummary);

export default router;
