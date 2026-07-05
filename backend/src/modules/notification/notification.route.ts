import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from './notification.controller';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

router.get('/', getMyNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);

export default router;
