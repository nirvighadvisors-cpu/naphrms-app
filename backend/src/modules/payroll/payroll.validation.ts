import { z } from 'zod';

// ── Create Salary Structure ─────────────────────────────────
export const createStructureSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

// ── Add Salary Component ────────────────────────────────────
export const addComponentSchema = z.object({
  name: z.string().min(1, 'Component name is required'),
  code: z.string().optional(),
  type: z.enum(['EARNING', 'DEDUCTION']).optional(),
  category: z.enum(['EARNING', 'DEDUCTION', 'REIMBURSEMENT', 'BONUS', 'STATUTORY_EMPLOYEE', 'STATUTORY_EMPLOYER']).default('EARNING'),
  calculationType: z.enum(['FIXED', 'PERCENTAGE_OF_BASIC', 'PERCENTAGE_OF_GROSS', 'PERCENTAGE_OF_CTC', 'FORMULA', 'SLAB_BASED']),
  value: z.number().min(0, 'Value cannot be negative'),
  formula: z.string().optional(),
  dependsOn: z.array(z.string()).optional(),
  isStatutory: z.boolean().optional(),
  isTaxable: z.boolean().optional(),
  minValue: z.number().optional(),
  maxValue: z.number().optional(),
  order: z.number().int().min(0, 'Order must be 0 or greater'),
});

// ── Update Salary Component (all fields optional) ───────────
export const updateComponentSchema = z.object({
  name: z.string().min(1, 'Component name is required').optional(),
  code: z.string().optional(),
  type: z.enum(['EARNING', 'DEDUCTION']).optional(),
  category: z.enum(['EARNING', 'DEDUCTION', 'REIMBURSEMENT', 'BONUS', 'STATUTORY_EMPLOYEE', 'STATUTORY_EMPLOYER']).optional(),
  calculationType: z.enum(['FIXED', 'PERCENTAGE_OF_BASIC', 'PERCENTAGE_OF_GROSS', 'PERCENTAGE_OF_CTC', 'FORMULA', 'SLAB_BASED']).optional(),
  value: z.number().min(0, 'Value cannot be negative').optional(),
  formula: z.string().optional(),
  dependsOn: z.array(z.string()).optional(),
  isStatutory: z.boolean().optional(),
  isTaxable: z.boolean().optional(),
  minValue: z.number().optional(),
  maxValue: z.number().optional(),
  order: z.number().int().min(0, 'Order must be 0 or greater').optional(),
});

// ── Assign Structure to Employee ────────────────────────────
export const assignStructureSchema = z.object({
  employeeId: z.string().uuid('Invalid employee ID').optional(),
  employeeIds: z.array(z.string().uuid('Invalid employee ID')).optional(),
  structureId: z.string().uuid('Invalid structure ID'),
  basicSalary: z.number().nonnegative('Basic salary cannot be negative'),
}).refine(data => data.employeeId || (data.employeeIds && data.employeeIds.length > 0), {
  message: "Either employeeId or employeeIds is required",
});

// ── Generate Payroll Run ────────────────────────────────────
export const generatePayrollSchema = z.object({
  month: z.number().int().min(1, 'Month must be between 1 and 12').max(12, 'Month must be between 1 and 12'),
  year: z.number().int().min(2020, 'Year must be 2020 or later').max(2050, 'Year must be 2050 or earlier'),
});

// ── Payroll Query (pagination + filters) ────────────────────
export const payrollQuerySchema = z.object({
  status: z.enum(['DRAFT', 'PROCESSING', 'COMPLETED', 'LOCKED']).optional(),
  month: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(12))
    .optional(),
  year: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(2020).max(2050))
    .optional(),
  page: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive())
    .optional(),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive().max(100))
    .optional(),
});
// ── Preview Salary Breakdown ────────────────────────────────
export const previewSalarySchema = z.object({
  basicSalary: z.number().nonnegative('Basic salary must be positive'),
});

export type CreateStructureInput = z.infer<typeof createStructureSchema>;
export type AddComponentInput = z.infer<typeof addComponentSchema>;
export type UpdateComponentInput = z.infer<typeof updateComponentSchema>;
export type AssignStructureInput = z.infer<typeof assignStructureSchema>;
export type GeneratePayrollInput = z.infer<typeof generatePayrollSchema>;
export type PayrollQuery = z.infer<typeof payrollQuerySchema>;
export type PreviewSalaryInput = z.infer<typeof previewSalarySchema>;
