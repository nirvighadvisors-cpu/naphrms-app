import { z } from 'zod';

// ── Punch In ─────────────────────────────────────────────────
export const punchInSchema = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  workSiteId: z.string().uuid().optional(),
  photoBase64: z.string().min(1, 'Live photo capture is required'),
});

// ── Punch Out ────────────────────────────────────────────────
export const punchOutSchema = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  photoBase64: z.string().min(1, 'Live photo capture is required'),
});

// ── Admin Manual Mark ────────────────────────────────────────
export const markAttendanceSchema = z.object({
  employeeId: z.string().uuid('Invalid employee ID'),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid ISO date'),
  status: z.enum([
    'PRESENT',
    'ABSENT',
    'HALF_DAY',
    'LATE',
    'WFH',
    'ON_LEAVE',
    'HOLIDAY',
    'WEEKEND',
  ]),
});

// ── Regularization Create ────────────────────────────────────
export const regularizationCreateSchema = z.object({
  attendanceId: z.string().uuid('Invalid attendance record ID').optional(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid ISO date').optional(),
  type: z.enum(['REGULAR', 'WFH']).optional().default('REGULAR'),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  requestedIn: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid ISO datetime')
    .optional(),
  requestedOut: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid ISO datetime')
    .optional(),
}).refine(data => data.attendanceId || data.date, {
  message: "Either attendanceId or date must be provided",
  path: ["attendanceId"]
});

// ── Regularization Review ────────────────────────────────────
export const regularizationReviewSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  remarks: z.string().optional(),
});

// ── Date Range Query (pagination + optional date filters) ────
export const dateRangeQuerySchema = z.object({
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

export type PunchInInput = z.infer<typeof punchInSchema>;
export type PunchOutInput = z.infer<typeof punchOutSchema>;
export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;
export type RegularizationCreateInput = z.infer<typeof regularizationCreateSchema>;
export type RegularizationReviewInput = z.infer<typeof regularizationReviewSchema>;
export type DateRangeQuery = z.infer<typeof dateRangeQuerySchema>;
