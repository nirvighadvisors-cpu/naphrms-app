import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { PERMISSIONS } from '../../config/permissions';
import { auditAction } from '../../middleware/audit.middleware';
import {
  listEmployees,
  getEmployeeStats,
  getMe,
  updateMe,
  createEmployee,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  getEmployeeHistory,
  getEmployeeDirectory,
  getEmployeeDirectoryById,
  changeEmployeeStatus,
  finalizeOffer,
  getOfferLetterUrls,
} from './employee.controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// All routes require authentication
router.use(authenticate);

// Stats must come before :id to avoid being caught as an ID
router.get('/stats', requirePermission(PERMISSIONS.EMPLOYEE_VIEW_ALL), getEmployeeStats);
router.get('/directory', getEmployeeDirectory);
router.get('/directory/:id', getEmployeeDirectoryById);
router.get('/me', getMe);
router.patch('/me', updateMe);
router.get('/', requirePermission(PERMISSIONS.EMPLOYEE_VIEW_ALL), listEmployees);
router.post('/', requirePermission(PERMISSIONS.EMPLOYEE_CREATE), auditAction('EMPLOYEE_CREATED', 'Employee'), createEmployee);
router.get('/:id', requirePermission(PERMISSIONS.EMPLOYEE_VIEW_ALL), getEmployeeById);
router.patch('/:id', requirePermission(PERMISSIONS.EMPLOYEE_EDIT_ALL), auditAction('EMPLOYEE_UPDATED', 'Employee'), updateEmployee);
router.delete('/:id', requirePermission(PERMISSIONS.EMPLOYEE_TERMINATE), auditAction('EMPLOYEE_DELETED', 'Employee'), deleteEmployee);
router.patch('/:id/status', requirePermission(PERMISSIONS.EMPLOYEE_TERMINATE), auditAction('EMPLOYEE_STATUS_CHANGED', 'Employee'), changeEmployeeStatus);
router.patch('/:id/finalize-offer', requirePermission(PERMISSIONS.EMPLOYEE_EDIT_ALL), upload.single('file'), auditAction('OFFER_FINALIZED', 'Employee'), finalizeOffer);
router.get('/:id/history', requirePermission(PERMISSIONS.EMPLOYEE_VIEW_ALL), getEmployeeHistory);
router.get('/:id/offer-letter-urls', requirePermission(PERMISSIONS.EMPLOYEE_VIEW_ALL), getOfferLetterUrls);

export default router;
