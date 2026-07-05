import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/rbac.middleware';
import {
  createClaim,
  getMyClaims,
  getClaimById,
  updateClaim,
  deleteClaim,
  addItem,
  deleteItem,
  cancelClaim,
  getAllClaims,
  reviewClaim,
  updatePayment,
  getExpenseSummary,
} from './expense.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ── Employee Routes ──────────────────────────────────────────
router.post('/', createClaim);
router.get('/my', getMyClaims);
router.patch('/:id/cancel', cancelClaim);
router.post('/:id/items', addItem);
router.delete('/:id/items/:itemId', deleteItem);

// ── Admin Routes ─────────────────────────────────────────────
router.get('/summary', requireAdmin, getExpenseSummary);
router.get('/', requireAdmin, getAllClaims);
router.patch('/:id/review', requireAdmin, reviewClaim);
router.patch('/:id/payment', requireAdmin, updatePayment);

// ── Shared Routes (ownership check in controller) ────────────
router.get('/:id', getClaimById);
router.patch('/:id', updateClaim);
router.delete('/:id', deleteClaim);

export default router;
