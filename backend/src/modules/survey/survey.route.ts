import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import {
  createSurvey,
  getAllSurveys,
  getActiveSurveys,
  getSurveyDetails,
  submitSurvey,
  getSurveyResponses,
} from './survey.controller';

const router = Router();

// Middleware
router.use(authenticate);

// Admin routes
router.post('/', requireRole(['HR_ADMIN']), createSurvey);
router.get('/admin/all', requireRole(['HR_ADMIN']), getAllSurveys);
router.get('/:id/responses', requireRole(['HR_ADMIN']), getSurveyResponses);

// Employee / general routes
router.get('/active', getActiveSurveys);
router.get('/:id', getSurveyDetails);
router.post('/:id/submit', submitSurvey);

export default router;
