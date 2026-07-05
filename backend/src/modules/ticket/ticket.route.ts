import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import {
  createTicket,
  getMyTickets,
  getTicketDetails,
  addComment,
  getAllTickets,
  updateTicketStatus,
  assignTicket,
} from './ticket.controller';

const router = Router();

// Middleware
router.use(authenticate);

// Employee routes
router.post('/', createTicket);
router.get('/my-tickets', getMyTickets);
// Admin routes
router.get('/admin/all', requireRole(['HR_ADMIN']), getAllTickets);
router.put('/admin/:id/status', requireRole(['HR_ADMIN']), updateTicketStatus);
router.put('/admin/:id/assign', requireRole(['HR_ADMIN']), assignTicket);

// Employee dynamic routes
router.get('/:id', getTicketDetails);
router.post('/:id/comments', addComment);

export default router;
