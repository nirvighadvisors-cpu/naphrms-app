import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/rbac.middleware';
import {
  getStructures,
  createStructure,
  getStructure,
  deleteStructure,
  duplicateStructure,
  addComponent,
  updateComponent,
  deleteComponent,
  assignStructure,
  getPayrollRuns,
  generatePayroll,
  getPayrollRun,
  lockPayroll,
  getMyPayslips,
  getPayslip,
  previewSalary,
  deletePayrollRun,
} from './payroll.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ── Salary Structure routes (Admin only) ─────────────────────
router.get('/structures', requireAdmin, getStructures);
router.post('/structures', requireAdmin, createStructure);
router.get('/structures/:id', requireAdmin, getStructure);
router.delete('/structures/:id', requireAdmin, deleteStructure);
router.post('/structures/:id/duplicate', requireAdmin, duplicateStructure);
router.post('/structures/:id/components', requireAdmin, addComponent);
router.patch('/structures/:structureId/components/:componentId', requireAdmin, updateComponent);
router.delete('/structures/:structureId/components/:componentId', requireAdmin, deleteComponent);

// ── Assignment route (Admin only) ────────────────────────────
router.post('/assign', requireAdmin, assignStructure);

// ── Salary Preview route (Admin only) ────────────────────────
router.post('/structures/:id/preview', requireAdmin, previewSalary);

// ── Statutory Rules routes (Admin only) ──────────────────────
import {
  getStatutoryRules,
  updateStatutoryRule,
  getStructureVersions,
  getStructureVersion,
  getAuditLogs,
} from './payroll.controller';
router.get('/statutory-rules', requireAdmin, getStatutoryRules);
router.patch('/statutory-rules/:id', requireAdmin, updateStatutoryRule);

// ── Audit & Versioning routes (Admin only) ───────────────────
router.get('/structures/:id/versions', requireAdmin, getStructureVersions);
router.get('/structures/:id/versions/:versionId', requireAdmin, getStructureVersion);
router.get('/audit-logs', requireAdmin, getAuditLogs);

// ── Payroll Run routes (Admin only) ──────────────────────────
router.get('/runs', requireAdmin, getPayrollRuns);
router.post('/runs/generate', requireAdmin, generatePayroll);
router.get('/runs/:id', requireAdmin, getPayrollRun);
router.patch('/runs/:id/lock', requireAdmin, lockPayroll);
router.delete('/runs/:id', requireAdmin, deletePayrollRun);

// ── Payslip routes (Any authenticated user) ──────────────────
router.get('/payslips/my', getMyPayslips);
router.get('/payslips/:id', getPayslip);

export default router;
