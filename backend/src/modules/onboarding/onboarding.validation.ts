import { z } from 'zod';

// ── Step 1: Personal Information ──────────────────────────────

export const personalInfoSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').max(100),
  middleName: z.string().max(100).optional().or(z.literal('')),
  lastName: z.string().min(1, 'Last name is required').max(100),
  dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date format'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']),
  maritalStatus: z.enum(['SINGLE', 'MARRIED', 'DIVORCED']),
  bloodGroup: z
    .enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
    .optional()
    .nullable()
    .or(z.literal('')),
  phone: z.string().min(10, 'Phone must be at least 10 digits').max(20),
  personalEmail: z.string().email('Invalid email').optional().or(z.literal('')),
});

// ── Step 2: Address ───────────────────────────────────────────

const addressObjectSchema = z.object({
  houseNo: z.string().trim().min(1, 'House/Flat No. is required'),
  building: z.string().trim().min(1, 'Building/Society is required'),
  street: z.string().trim().min(1, 'Street/Area is required'),
  landmark: z.string().trim().optional().or(z.literal('')),
  city: z.string().trim().min(1, 'Village/City is required'),
  taluka: z.string().trim().min(1, 'Taluka is required'),
  district: z.string().trim().min(1, 'District is required'),
  state: z.string().trim().min(1, 'State is required'),
  country: z.string().trim().default('India'),
  pinCode: z.string().trim().regex(/^\d{6}$/, 'PIN Code must be exactly 6 digits'),
});

export const addressSchema = z.object({
  currentAddress: addressObjectSchema,
  permanentAddress: addressObjectSchema,
  sameAsCurrent: z.boolean().optional(),
});

// ── Step 3: Emergency Contact ─────────────────────────────────

export const emergencyContactSchema = z.object({
  emergencyContactName: z.string().min(2, 'Emergency contact name must be at least 2 characters').max(100),
  emergencyContactRel: z.enum(['FATHER', 'MOTHER', 'SPOUSE', 'SIBLING', 'FRIEND', 'OTHER']),
  emergencyContactPhone: z.string().min(10, 'Phone must be at least 10 digits').max(20),
  emergencyContact2Name: z.string().max(100).optional().or(z.literal('')),
  emergencyContact2Rel: z
    .enum(['FATHER', 'MOTHER', 'SPOUSE', 'SIBLING', 'FRIEND', 'OTHER'])
    .optional()
    .nullable()
    .or(z.literal('')),
  emergencyContact2Phone: z.string().max(20).optional().or(z.literal('')),
});

// ── Step 4: Bank Details ──────────────────────────────────────

export const bankDetailsSchema = z.object({
  bankName: z.string().min(2, 'Bank name must be at least 2 characters').max(100),
  bankAccountHolder: z.string().min(2, 'Account holder name must be at least 2 characters').max(100),
  bankAccountNumber: z.string().min(5, 'Account number must be at least 5 characters').max(30),
  bankIFSC: z
    .string()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code format (e.g. SBIN0001234)'),
  bankBranch: z.string().max(100).optional().or(z.literal('')),
});

// ── Step 5: Sign Offer Letter ─────────────────────────────────

export const signOfferSchema = z.object({
  signatureStoragePath: z.string().min(1, 'Signature storage path is required'),
  offerLetterHash: z.string().min(1, 'Offer letter hash is required'),
  ipAddress: z.string(),
  userAgent: z.string(),
  policyAccepted: z.boolean().refine(val => val === true, "You must accept the company policies"),
});

// ── Type Exports ──────────────────────────────────────────────

export type PersonalInfoInput = z.infer<typeof personalInfoSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type EmergencyContactInput = z.infer<typeof emergencyContactSchema>;
export type BankDetailsInput = z.infer<typeof bankDetailsSchema>;
export type SignOfferInput = z.infer<typeof signOfferSchema>;
