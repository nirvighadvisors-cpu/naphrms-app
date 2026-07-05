import { z } from 'zod';

// ── Admin: Review Cycles ─────────────────────────────────────
export const createCycleSchema = z.object({
  name: z.string().min(3, 'Cycle name must be at least 3 characters').max(100),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid start date'),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid end date'),
}).refine(data => new Date(data.startDate) <= new Date(data.endDate), {
  message: "End date must be after start date",
  path: ["endDate"],
});

export const updateCycleStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']),
});

// ── Employee: Goals ──────────────────────────────────────────
export const createGoalSchema = z.object({
  cycleId: z.string().uuid('Invalid cycle ID'),
  title: z.string().min(5, 'Goal title must be at least 5 characters').max(200),
  description: z.string().optional(),
  targetDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid target date').optional(),
});

export const updateGoalProgressSchema = z.object({
  progress: z.number().int().min(0).max(100),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
});

// ── Employee: Self Review ────────────────────────────────────
export const submitSelfReviewSchema = z.object({
  selfRating: z.number().min(1, 'Rating must be between 1 and 5').max(5, 'Rating must be between 1 and 5'),
  selfComments: z.string().min(10, 'Please provide more detailed comments (min 10 chars)'),
});

// ── Admin: HR Review ─────────────────────────────────────────
export const submitHrReviewSchema = z.object({
  hrRating: z.number().min(1, 'Rating must be between 1 and 5').max(5, 'Rating must be between 1 and 5'),
  hrComments: z.string().min(10, 'Please provide more detailed comments (min 10 chars)'),
  finalRating: z.number().min(1).max(5),
});

// ── Queries ──────────────────────────────────────────────────
export const cycleQuerySchema = z.object({
  status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']).optional(),
});

export const reviewQuerySchema = z.object({
  cycleId: z.string().uuid('Invalid cycle ID').optional(),
  status: z.enum(['SELF_REVIEW_PENDING', 'SELF_SUBMITTED', 'HR_REVIEW_PENDING', 'COMPLETED']).optional(),
  employeeId: z.string().uuid('Invalid employee ID').optional(),
  page: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().positive()).optional(),
  limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().positive().max(100)).optional(),
});

export type CreateCycleInput = z.infer<typeof createCycleSchema>;
export type UpdateCycleStatusInput = z.infer<typeof updateCycleStatusSchema>;
export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalProgressInput = z.infer<typeof updateGoalProgressSchema>;
export type SubmitSelfReviewInput = z.infer<typeof submitSelfReviewSchema>;
export type SubmitHrReviewInput = z.infer<typeof submitHrReviewSchema>;
