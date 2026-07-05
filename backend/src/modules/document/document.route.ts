import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/rbac.middleware';
import {
  getMyDocuments,
  getEmployeeDocuments,
  uploadEmployeeDocument,
  deleteEmployeeDocument,
  getPolicies,
  createPolicy,
  updatePolicy,
  deletePolicy,
  replacePolicy,
  replaceEmployeeDocument
} from './document.controller';

const router = Router();

// Ensure all routes require authentication
router.use(authenticate);

// ── EMPLOYEE DOCUMENTS ────────────────────────────────────────

// Employee managing their own documents
router.get('/employee/my', getMyDocuments);
router.post('/employee', uploadEmployeeDocument);

// Admin managing an employee's documents
router.get('/employee/:employeeId', requireAdmin, getEmployeeDocuments);
router.post('/employee/:employeeId', requireAdmin, uploadEmployeeDocument);

// Both (Admin or owner Employee) can delete and replace
router.delete('/employee/:id', deleteEmployeeDocument);
router.patch('/employee/:id/replace', replaceEmployeeDocument);

// ── COMPANY POLICIES ──────────────────────────────────────────

// Everyone can view policies
router.get('/policies', getPolicies);

// Only Admins can manage policies
router.post('/policies', requireAdmin, createPolicy);
router.patch('/policies/:id', requireAdmin, updatePolicy);
router.delete('/policies/:id', requireAdmin, deletePolicy);
router.patch('/policies/:id/replace', requireAdmin, replacePolicy);

export default router;
