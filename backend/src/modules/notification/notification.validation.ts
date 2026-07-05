import { z } from 'zod';

export const dateRangeQuerySchema = z.object({
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
