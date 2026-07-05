import { z } from 'zod';

// ── Expense Item Sub-Schema ──────────────────────────────────
const expenseItemSchema = z.object({
  description: z.string().min(2, 'Description must be at least 2 characters'),
  amount: z.number().positive('Amount must be positive'),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid ISO date'),
  receiptUrl: z.string().url('Invalid receipt URL').optional(),
  receiptBase64: z.string().optional(),
});

// ── Create Expense Claim ─────────────────────────────────────
export const createClaimSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title is too long'),
  category: z.enum([
    'TRAVEL',
    'LOCAL_TRANSPORT',
    'ACCOMMODATION',
    'MEALS',
    'CLIENT_ENTERTAINMENT',
    'SITE_VISIT',
    'OFFICE_SUPPLIES',
    'OTHER',
  ]),
  items: z
    .array(expenseItemSchema)
    .min(1, 'At least one expense item is required'),
});

// ── Update Expense Claim (while PENDING) ─────────────────────
export const updateClaimSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title is too long').optional(),
  category: z.enum([
    'TRAVEL',
    'LOCAL_TRANSPORT',
    'ACCOMMODATION',
    'MEALS',
    'CLIENT_ENTERTAINMENT',
    'SITE_VISIT',
    'OFFICE_SUPPLIES',
    'OTHER',
  ]).optional(),
});

// ── Add Item to Existing Claim ───────────────────────────────
export const addItemSchema = expenseItemSchema;

// ── Review Claim (Admin) ─────────────────────────────────────
export const reviewClaimSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  remarks: z.string().optional(),
});

// ── Update Payment Status (Admin) ────────────────────────────
export const updatePaymentSchema = z.object({
  paymentStatus: z.enum(['APPROVED_FOR_PAYMENT', 'PAID']),
});

// ── Expense Query (pagination + filters) ─────────────────────
export const expenseQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
  category: z.enum([
    'TRAVEL',
    'LOCAL_TRANSPORT',
    'ACCOMMODATION',
    'MEALS',
    'CLIENT_ENTERTAINMENT',
    'SITE_VISIT',
    'OFFICE_SUPPLIES',
    'OTHER',
  ]).optional(),
  paymentStatus: z.enum(['UNPAID', 'APPROVED_FOR_PAYMENT', 'PAID']).optional(),
  employeeId: z.string().uuid('Invalid employee ID').optional(),
  startDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid start date')
    .optional(),
  endDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid end date')
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

export type CreateClaimInput = z.infer<typeof createClaimSchema>;
export type UpdateClaimInput = z.infer<typeof updateClaimSchema>;
export type AddItemInput = z.infer<typeof addItemSchema>;
export type ReviewClaimInput = z.infer<typeof reviewClaimSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
export type ExpenseQuery = z.infer<typeof expenseQuerySchema>;
