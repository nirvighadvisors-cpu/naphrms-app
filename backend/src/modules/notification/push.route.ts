import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { getVapidKey, subscribe, unsubscribe } from './push.controller';

const router = Router();

// Public route — frontend needs VAPID key before user is authenticated
router.get('/vapid-key', getVapidKey);

// Authenticated routes
router.use(authenticate);
router.post('/subscribe', subscribe);
router.delete('/unsubscribe', unsubscribe);

export default router;
