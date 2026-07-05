import { z } from 'zod';

export const uploadEmployeeDocumentSchema = z.object({
  type: z.enum([
    'PAN_CARD',
    'AADHAAR_CARD',
    'PASSPORT',
    'OFFER_LETTER',
    'EXPERIENCE_LETTER',
    'EDUCATION_CERTIFICATE',
    'FITNESS_CERTIFICATE',
    'OTHER'
  ]),
  fileName: z.string().min(1, 'File name is required'),
  fileUrl: z.string().url('Must be a valid URL'),
  fileSize: z.number().positive('File size must be positive').optional(),
  expiresAt: z.string().datetime().optional().nullable(),
});

export const createPolicySchema = z.object({
  title: z.string().min(3, 'Title is required'),
  description: z.string().optional(),
  fileUrl: z.string().min(1, 'File URL is required').superRefine((val, ctx) => {
    if (val.startsWith('data:')) {
      const mimeMatch = val.match(/^data:([^;]+);/);
      const mimeType = mimeMatch ? mimeMatch[1] : '';
      
      if (mimeType !== 'application/pdf') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Unsupported file type. Only PDF is allowed for policies.',
        });
        return;
      }

      const base64Data = val.split(',')[1];
      if (base64Data) {
        let padding = 0;
        if (base64Data.endsWith('==')) padding = 2;
        else if (base64Data.endsWith('=')) padding = 1;
        
        const sizeInBytes = (base64Data.length * 3 / 4) - padding;
        
        if (sizeInBytes > 2 * 1024 * 1024) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'PDF file size must not exceed 2 MB.',
          });
        }
      }
    }
  }),
  version: z.string().min(1, 'Version is required'),
  isActive: z.boolean().default(true),
});

export const updatePolicySchema = z.object({
  isActive: z.boolean(),
});

export const replaceDocumentSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  fileUrl: z.string().url('Must be a valid URL'),
  fileSize: z.number().positive('File size must be positive').optional(),
});

export const replacePolicySchema = z.object({
  fileUrl: z.string().min(1, 'File URL is required'), // Keep simple URL validation as frontend uploads directly to Supabase now
  version: z.string().min(1, 'Version is required'),
});
