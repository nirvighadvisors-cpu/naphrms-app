import { z } from 'zod';

export const submitDailyLogSchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }),
  content: z.string().min(5, 'Log content must be at least 5 characters'),
});
