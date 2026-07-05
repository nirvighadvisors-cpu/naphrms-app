import { z } from 'zod';

// ── Create Leave Type ────────────────────────────────────────
export const createLeaveTypeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  code: z.string().min(2, 'Code must be at least 2 characters').toUpperCase(),
  description: z.string().optional().nullable(),
  isPaid: z.boolean().optional(),
  maxDaysPerYear: z.number().int().min(0, 'Max days cannot be negative').optional(),
  carryForward: z.boolean().optional(),
  maxCarryForward: z.number().int().min(0, 'Max carry forward cannot be negative').optional().nullable(),
  requiresDoc: z.boolean().optional(),
  noticeDays: z.number().int().min(0, 'Notice days cannot be negative').optional(),
});

// ── Update Leave Type ────────────────────────────────────────
export const updateLeaveTypeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  code: z.string().min(2, 'Code must be at least 2 characters').toUpperCase().optional(),
  description: z.string().optional().nullable(),
  isPaid: z.boolean().optional(),
  maxDaysPerYear: z.number().int().min(0, 'Max days cannot be negative').optional(),
  carryForward: z.boolean().optional(),
  maxCarryForward: z.number().int().min(0, 'Max carry forward cannot be negative').optional().nullable(),
  requiresDoc: z.boolean().optional(),
  noticeDays: z.number().int().min(0, 'Notice days cannot be negative').optional(),
});

// ── Apply Leave ──────────────────────────────────────────────
export const applyLeaveSchema = z.object({
  leaveTypeId: z.string().uuid('Invalid leave type ID'),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid ISO date'),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid ISO date'),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  attachment: z.string().url('Invalid attachment URL').optional(),
  childNumber: z.number().int().min(1).optional(),
  expectedDeliveryDate: z.string().optional(),
});

// ── Review Leave ─────────────────────────────────────────────
export const reviewLeaveSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'PENDING_DOCS']),
  remarks: z.string().optional(),
});

// ── Upload Document ──────────────────────────────────────────
export const uploadLeaveDocSchema = z.object({
  attachment: z.string().url('Invalid attachment URL'),
});

// ── Initialize Balances ──────────────────────────────────────
export const initBalancesSchema = z.object({
  year: z.number().int().min(2020, 'Year must be 2020 or later').max(2050, 'Year must be 2050 or earlier'),
  employeeIds: z.array(z.string().uuid('Invalid employee ID')).optional(),
});

// ── Leave Query (pagination + filters) ───────────────────────
export const leaveQuerySchema = z.object({
  status: z.enum(['PENDING', 'PENDING_DOCS', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
  startDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid start date')
    .optional(),
  endDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid end date')
    .optional(),
  leaveTypeId: z.string().uuid('Invalid leave type ID').optional(),
  employeeId: z.string().uuid('Invalid employee ID').optional(),
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

export type CreateLeaveTypeInput = z.infer<typeof createLeaveTypeSchema>;
export type UpdateLeaveTypeInput = z.infer<typeof updateLeaveTypeSchema>;
export type ApplyLeaveInput = z.infer<typeof applyLeaveSchema>;
export type ReviewLeaveInput = z.infer<typeof reviewLeaveSchema>;
export type InitBalancesInput = z.infer<typeof initBalancesSchema>;
export type LeaveQuery = z.infer<typeof leaveQuerySchema>;
