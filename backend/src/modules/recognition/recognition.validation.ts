import { z } from 'zod';

export const createBadgeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  icon: z.string().min(1, 'Icon is required'),
  description: z.string().optional(),
});

export const updateBadgeSchema = z.object({
  name: z.string().optional(),
  icon: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const sendRecognitionSchema = z.object({
  receiverId: z.string().uuid('Invalid receiver ID'),
  badgeId: z.string().uuid('Invalid badge ID'),
  message: z.string().min(1, 'Message is required'),
  isPublic: z.boolean().optional().default(true),
});
