import { z } from 'zod';

export const upsertSettingsSchema = z.object({
  settings: z.array(z.object({
    key: z.string().min(1),
    value: z.string(),
    type: z.enum(['STRING', 'BOOLEAN', 'NUMBER', 'JSON']).default('STRING'),
    description: z.string().optional(),
    isPublic: z.boolean().default(false),
  })),
});
