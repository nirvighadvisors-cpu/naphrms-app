import { z } from 'zod';

export const createEmployeeSchema = z.object({
  // Required fields
  firstName: z.string().trim().min(2, 'First name must be at least 2 characters').max(50, 'First name cannot exceed 50 characters').regex(/^[a-zA-Z\s]+$/, 'First name can only contain letters'),
  lastName: z.string().trim().min(2, 'Last name must be at least 2 characters').max(50, 'Last name cannot exceed 50 characters').regex(/^[a-zA-Z\s]+$/, 'Last name can only contain letters'),
  email: z.string().trim().email('Invalid email address'),
  dateOfJoining: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date'),
  designation: z.string().min(1, 'Designation is required').max(100),
  departmentId: z.string().uuid('Invalid department'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']),
  dateOfBirth: z.string().refine((val) => {
    const dob = new Date(val);
    if (isNaN(dob.getTime())) return false;
    const today = new Date();
    if (dob > today) return false;
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age >= 18;
  }, 'Employee must be at least 18 years old to be registered.'),
  phone: z.string().trim().regex(/^\+91 \d{10}$/, 'Invalid Indian phone number format'),

  // Optional fields
  personalEmail: z.string().email().optional().or(z.literal('')),
  alternatePhone: z.string().max(20).optional().or(z.literal('')),
  currentAddress: z.string().max(2000).optional().or(z.literal('')),
  permanentAddress: z.string().max(2000).optional().or(z.literal('')),
  emergencyContactName: z.string().trim().min(1, 'Emergency contact name is required').max(100),
  emergencyContactRel: z.string().trim().min(1, 'Emergency contact relationship is required').max(50),
  emergencyContactPhone: z.string().trim().regex(/^\+91 \d{10}$/, 'Invalid Indian phone number format'),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'INTERN']).optional(),
  managerId: z.string().uuid().optional().nullable(),
  workSiteId: z.string().uuid().optional().nullable(),
  weekOffDays: z.array(z.string()).optional(),
  isEsicCovered: z.boolean().optional(),
  esicNumber: z.string().max(50).optional().nullable(),
  taxRegime: z.enum(['OLD', 'NEW']).optional(),
  uanNumber: z.string().max(50).optional().nullable(),
  pfAccountNumber: z.string().max(50).optional().nullable(),
  panNumber: z.string().max(20).optional().nullable(),
});

export const updateEmployeeSchema = createEmployeeSchema.partial().omit({ email: true });

export const updateStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'TERMINATED', 'ON_LEAVE']),
  reason: z.string().optional(),
}).superRefine((data, ctx) => {
  if ((data.status === 'INACTIVE' || data.status === 'TERMINATED') && (!data.reason || data.reason.trim().length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Reason is required when marking an employee as Inactive or Terminated.',
      path: ['reason'],
    });
  }
});

export const updateMeSchema = z.object({
  personalEmail: z.string().email().optional().or(z.literal('')),
  phone: z.string().trim().regex(/^\+91 \d{10}$/, 'Invalid Indian phone number format').optional().or(z.literal('')),
  alternatePhone: z.string().max(20).optional().or(z.literal('')),
  currentAddress: z.string().max(2000).optional().or(z.literal('')),
  permanentAddress: z.string().max(2000).optional().or(z.literal('')),
  emergencyContactName: z.string().trim().min(1, 'Emergency contact name is required').max(100),
  emergencyContactRel: z.string().trim().min(1, 'Emergency contact relationship is required').max(50),
  emergencyContactPhone: z.string().trim().regex(/^\+91 \d{10}$/, 'Invalid Indian phone number format'),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type UpdateMeInput = z.infer<typeof updateMeSchema>;
