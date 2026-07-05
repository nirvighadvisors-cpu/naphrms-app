import { Request, Response } from 'express';
import prisma from '../../config/database';
import { config } from '../../config/env';
import { sendEmail } from '../../lib/email';
import { uploadFile, getSignedUrl } from '../../lib/storage';
import { OfferLetterService } from './offer-letter.service';
import { verifyDocument } from '../../lib/document-verifier';
import { broadcastToRole, getHRAdminUserIds, getEmployeeName, notifyUsers } from '../../services/notification.service';
import {
  personalInfoSchema,
  addressSchema,
  emergencyContactSchema,
  bankDetailsSchema,
  signOfferSchema,
} from './onboarding.validation';

// ── Helpers ───────────────────────────────────────────────────

/** Map DocumentType enum to a storage folder name */
function docTypeToFolder(type: string): string {
  const map: Record<string, string> = {
    PAN_CARD: 'pan-cards',
    AADHAAR: 'aadhaar',
    BANK_PASSBOOK: 'bank-passbooks',
    PROFILE_PHOTO: 'profile-photos',
    CANCELLED_CHEQUE: 'cancelled-cheques',
    EDUCATION_CERT: 'education-certs',
    EXPERIENCE_CERT: 'experience-certs',
    SIGNATURE: 'signatures',
    OFFER_LETTER: 'offer-letters',
    FITNESS_CERTIFICATE: 'fitness-certs',
  };
  return map[type] || 'other';
}

/** Valid document types accepted during onboarding */
const VALID_DOC_TYPES = [
  'PAN_CARD',
  'AADHAAR',
  'BANK_PASSBOOK',
  'PROFILE_PHOTO',
  'CANCELLED_CHEQUE',
  'EDUCATION_CERT',
  'EXPERIENCE_CERT',
  'SIGNATURE',
  'OFFER_LETTER',
  'FITNESS_CERTIFICATE',
] as const;

// ── GET /api/onboarding/status ────────────────────────────────

export const getOnboardingStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const employeeId = req.user?.employeeId;
    if (!employeeId) {
      res.status(400).json({ error: { code: 'NO_EMPLOYEE', message: 'No employee profile linked to this user' } });
      return;
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        isProfileComplete: true,
        onboardingStep: true,
        // Step 1 fields
        dateOfBirth: true,
        gender: true,
        maritalStatus: true,
        bloodGroup: true,
        phone: true,
        personalEmail: true,
        // Step 2 fields
        currentAddress: true,
        permanentAddress: true,
        // Step 3 fields
        emergencyContactName: true,
        emergencyContactRel: true,
        emergencyContactPhone: true,
        emergencyContact2Name: true,
        emergencyContact2Rel: true,
        emergencyContact2Phone: true,
        // Step 4 fields
        bankName: true,
        bankAccountNumber: true,
        bankIFSC: true,
        bankAccountHolder: true,
        bankBranch: true,
        // Step 5 fields
        offerLetterSignedAt: true,
        signatureUrl: true,
        offerLetterStatus: true,
        offerLetterDetailsSubmittedAt: true,
        partialOfferLetterUrl: true,
        finalOfferLetterUrl: true,
        // Step 6 fields (Offer Letter Details - read-only context)
        dateOfJoining: true,
        designation: true,
        departmentId: true,
        department: { select: { name: true } },
        managerId: true,
        manager: { select: { firstName: true, lastName: true } },
        panNumber: true,
        aadhaarNumber: true,
        uanNumber: true,
        documents: true,
      },
    });

    if (!employee) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' } });
      return;
    }

    const verifiedTypes = employee.documents
      .filter((d: any) => d.verificationStatus === 'VERIFIED' || d.verificationStatus === 'SKIPPED')
      .map((d: any) => d.type);
    const hasRequiredDocs = verifiedTypes.includes('PAN_CARD') && verifiedTypes.includes('AADHAAR') && verifiedTypes.includes('PROFILE_PHOTO') && verifiedTypes.includes('FITNESS_CERTIFICATE') && verifiedTypes.includes('EDUCATION_CERT');

    // Determine which steps are complete
    const steps = {
      personalInfo: !!(employee.firstName && employee.lastName && employee.dateOfBirth && employee.gender && employee.phone),
      address: !!(employee.currentAddress && employee.permanentAddress),
      emergencyContact: !!(employee.emergencyContactName && employee.emergencyContactRel && employee.emergencyContactPhone),
      bankDetails: !!(employee.bankName && employee.bankAccountNumber && employee.bankIFSC && employee.bankAccountHolder),
      documents: hasRequiredDocs,
      offerSigned: !!employee.offerLetterSignedAt,
      offerDetailsDone: !!employee.offerLetterDetailsSubmittedAt,
    };

    res.json({
      data: {
        ...employee,
        isProfileComplete: employee.isProfileComplete,
        onboardingStep: employee.onboardingStep,
        steps,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch onboarding status', details: error.message } });
  }
};

// ── PATCH /api/onboarding/personal ────────────────────────────

export const updatePersonalInfo = async (req: Request, res: Response): Promise<void> => {
  const parsed = personalInfoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  const employeeId = req.user?.employeeId;
  if (!employeeId) {
    res.status(400).json({ error: { code: 'NO_EMPLOYEE', message: 'No employee profile linked to this user' } });
    return;
  }

  try {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' } });
      return;
    }

    const { dateOfBirth, middleName, personalEmail, bloodGroup, ...rest } = parsed.data;

    const updated = await prisma.employee.update({
      where: { id: employeeId },
      data: {
        ...rest,
        middleName: middleName || null,
        personalEmail: personalEmail || null,
        bloodGroup: bloodGroup || null,
        dateOfBirth: new Date(dateOfBirth),
        onboardingStep: Math.max(employee.onboardingStep, 1),
      },
    });

    res.json({ data: updated });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'UPDATE_FAILED', message: 'Failed to update personal info', details: error.message } });
  }
};

// ── PATCH /api/onboarding/address ─────────────────────────────

export const updateAddress = async (req: Request, res: Response): Promise<void> => {
  const parsed = addressSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  const employeeId = req.user?.employeeId;
  if (!employeeId) {
    res.status(400).json({ error: { code: 'NO_EMPLOYEE', message: 'No employee profile linked to this user' } });
    return;
  }

  try {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' } });
      return;
    }

    let { currentAddress, permanentAddress, sameAsCurrent } = parsed.data;

    // If sameAsCurrent, copy current to permanent
    if (sameAsCurrent) {
      permanentAddress = { ...currentAddress };
    }

    const updated = await prisma.employee.update({
      where: { id: employeeId },
      data: {
        currentAddress: JSON.stringify(currentAddress),
        permanentAddress: JSON.stringify(permanentAddress),
        onboardingStep: Math.max(employee.onboardingStep, 2),
      },
    });

    res.json({ data: updated });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'UPDATE_FAILED', message: 'Failed to update address', details: error.message } });
  }
};

// ── PATCH /api/onboarding/emergency ───────────────────────────

export const updateEmergencyContact = async (req: Request, res: Response): Promise<void> => {
  const parsed = emergencyContactSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  const employeeId = req.user?.employeeId;
  if (!employeeId) {
    res.status(400).json({ error: { code: 'NO_EMPLOYEE', message: 'No employee profile linked to this user' } });
    return;
  }

  try {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' } });
      return;
    }

    const {
      emergencyContactName,
      emergencyContactRel,
      emergencyContactPhone,
      emergencyContact2Name,
      emergencyContact2Rel,
      emergencyContact2Phone,
    } = parsed.data;

    const updated = await prisma.employee.update({
      where: { id: employeeId },
      data: {
        emergencyContactName,
        emergencyContactRel,
        emergencyContactPhone,
        emergencyContact2Name: emergencyContact2Name || null,
        emergencyContact2Rel: emergencyContact2Rel || null,
        emergencyContact2Phone: emergencyContact2Phone || null,
        onboardingStep: Math.max(employee.onboardingStep, 3),
      },
    });

    res.json({ data: updated });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'UPDATE_FAILED', message: 'Failed to update emergency contact', details: error.message } });
  }
};

// ── PATCH /api/onboarding/bank ────────────────────────────────

export const updateBankDetails = async (req: Request, res: Response): Promise<void> => {
  const parsed = bankDetailsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  const employeeId = req.user?.employeeId;
  if (!employeeId) {
    res.status(400).json({ error: { code: 'NO_EMPLOYEE', message: 'No employee profile linked to this user' } });
    return;
  }

  try {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' } });
      return;
    }

    const { bankName, bankAccountHolder, bankAccountNumber, bankIFSC, bankBranch } = parsed.data;

    const updated = await prisma.employee.update({
      where: { id: employeeId },
      data: {
        bankName,
        bankAccountHolder,
        bankAccountNumber,
        bankIFSC,
        bankBranch: bankBranch || null,
        onboardingStep: Math.max(employee.onboardingStep, 4),
      },
    });

    res.json({ data: updated });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'UPDATE_FAILED', message: 'Failed to update bank details', details: error.message } });
  }
};

// ── POST /api/onboarding/documents ────────────────────────────

export const uploadDocument = async (req: Request, res: Response): Promise<void> => {
  const employeeId = req.user?.employeeId;
  if (!employeeId) {
    res.status(400).json({ error: { code: 'NO_EMPLOYEE', message: 'No employee profile linked to this user' } });
    return;
  }

  const file = req.file;
  if (!file) {
    res.status(400).json({ error: { code: 'NO_FILE', message: 'No file uploaded' } });
    return;
  }

  const docType = req.body.type as string;
  if (!docType || !VALID_DOC_TYPES.includes(docType as any)) {
    res.status(400).json({
      error: {
        code: 'INVALID_TYPE',
        message: `Invalid document type. Must be one of: ${VALID_DOC_TYPES.join(', ')}`,
      },
    });
    return;
  }

  try {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' } });
      return;
    }

    // Upload file to Supabase Storage
    const folder = docTypeToFolder(docType);
    const storagePath = await uploadFile(folder, file.originalname, file.buffer, file.mimetype);

    // ── AI Verification via Gemini ──────────────────────────
    const verificationResult = await verifyDocument(docType, file.buffer, file.mimetype, {
      firstName: employee.firstName,
      middleName: employee.middleName,
      lastName: employee.lastName,
      panNumber: employee.panNumber,
      aadhaarNumber: employee.aadhaarNumber,
      bankAccountNumber: employee.bankAccountNumber,
      bankAccountHolder: employee.bankAccountHolder,
      bankIFSC: employee.bankIFSC,
    });

    // Create document record with verification status
    const document = await prisma.employeeDocument.create({
      data: {
        employeeId,
        type: docType as any,
        fileName: file.originalname,
        fileUrl: storagePath,
        fileSize: file.size,
        uploadedById: req.user!.userId,
        verificationStatus: verificationResult.isVerified ? 'VERIFIED' : 'REJECTED',
        verificationRemarks: verificationResult.reason,
        extractedData: verificationResult.extractedData as any,
        verifiedAt: new Date(),
        aiRawResponse: JSON.stringify(verificationResult),
      },
    });

    // Special handling for PROFILE_PHOTO — update employee profilePhotoUrl with signed URL
    if (docType === 'PROFILE_PHOTO' && verificationResult.isVerified) {
      const signedUrl = await getSignedUrl(storagePath, 7 * 24 * 3600); // 7-day URL
      await prisma.employee.update({
        where: { id: employeeId },
        data: { profilePhotoUrl: signedUrl },
      });
    }

    // Special handling for SIGNATURE — store storage path on employee
    if (docType === 'SIGNATURE') {
      await prisma.employee.update({
        where: { id: employeeId },
        data: { signatureUrl: storagePath },
      });
    }

    // Generate a signed URL for the response
    const signedUrl = await getSignedUrl(storagePath);

    res.status(201).json({
      data: {
        ...document,
        signedUrl,
        verification: {
          status: verificationResult.isVerified ? 'VERIFIED' : 'REJECTED',
          reason: verificationResult.reason,
          extractedData: verificationResult.extractedData,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'UPLOAD_FAILED', message: 'Failed to upload document', details: error.message } });
  }
};

// ── POST /api/onboarding/sign-offer ───────────────────────────

export const signOfferLetter = async (req: Request, res: Response): Promise<void> => {
  const parsed = signOfferSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  const employeeId = req.user?.employeeId;
  if (!employeeId) {
    res.status(400).json({ error: { code: 'NO_EMPLOYEE', message: 'No employee profile linked to this user' } });
    return;
  }

  try {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' } });
      return;
    }

    // 1. Verify that a SIGNATURE document exists for this employee
    const signatureDoc = await prisma.employeeDocument.findFirst({
      where: { employeeId, type: 'SIGNATURE' },
    });

    if (!signatureDoc) {
      res.status(400).json({
        error: { code: 'NO_SIGNATURE', message: 'Please upload your signature before signing the offer letter' },
      });
      return;
    }

    const { signatureStoragePath, offerLetterHash, ipAddress, userAgent } = parsed.data;
    const signedAt = new Date();

    // 2. Create audit log entry
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'OFFER_LETTER_SIGNED',
        targetId: employeeId,
        targetType: 'Employee',
        status: 'SUCCESS',
        details: {
          signatureStoragePath,
          offerLetterHash,
          ipAddress,
          userAgent,
          signedAt,
        },
        ipAddress,
        userAgent,
      },
    });

    // 3. Update employee offer letter signed timestamp, dateOfJoining, and onboarding step
    await prisma.employee.update({
      where: { id: employeeId },
      data: {
        offerLetterSignedAt: signedAt,
        dateOfJoining: signedAt, // Auto-set joining date to e-sign date
        signatureUrl: signatureStoragePath,
        offerLetterStatus: 'E_SIGN_SUBMITTED',
        onboardingStep: Math.max(employee.onboardingStep, 6),
      },
    });

    res.json({
      data: {
        message: 'Offer letter signed successfully',
        signedAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'SIGN_FAILED', message: 'Failed to sign offer letter', details: error.message } });
  }
};

// ── PATCH /api/onboarding/offer-details ────────────────────────────

export const submitOfferDetails = async (req: Request, res: Response): Promise<void> => {
  const employeeId = req.user?.employeeId;
  if (!employeeId) {
    res.status(400).json({ error: { code: 'NO_EMPLOYEE', message: 'No employee profile linked to this user' } });
    return;
  }

  try {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' } });
      return;
    }

    // Must have signed the offer first
    if (!employee.offerLetterSignedAt) {
      res.status(400).json({ error: { code: 'NOT_SIGNED', message: 'Please sign the offer letter before submitting offer details' } });
      return;
    }

    const { panNumber, aadhaarNumber, uanNumber } = req.body;

    // Validate PAN format
    if (!panNumber || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber)) {
      res.status(400).json({ error: { code: 'INVALID_PAN', message: 'PAN Number must be in format: ABCDE1234F' } });
      return;
    }

    // Validate Aadhaar format
    if (!aadhaarNumber || !/^\d{12}$/.test(aadhaarNumber)) {
      res.status(400).json({ error: { code: 'INVALID_AADHAAR', message: 'Aadhaar Number must be exactly 12 digits' } });
      return;
    }

    // UAN is optional but if provided, validate format
    if (uanNumber && !/^\d{12}$/.test(uanNumber)) {
      res.status(400).json({ error: { code: 'INVALID_UAN', message: 'UAN Number must be exactly 12 digits' } });
      return;
    }

    await prisma.employee.update({
      where: { id: employeeId },
      data: {
        panNumber,
        aadhaarNumber,
        uanNumber: uanNumber || null,
        offerLetterStatus: 'OFFER_DETAILS_SUBMITTED',
        offerLetterDetailsSubmittedAt: new Date(),
        onboardingStep: Math.max(employee.onboardingStep, 7),
      },
    });

    // Fire generation asynchronously so we don't block the response
    // (Or we can wait for it, it's fast enough. Let's wait so the status updates immediately)
    await OfferLetterService.generateAndUploadPartial(employeeId);

    res.json({
      data: {
        message: 'Offer letter details submitted and template generated successfully',
      },
    });
  } catch (error: any) {
    console.error('Failed to submit offer details:', error);
    res.status(500).json({ error: { code: 'SUBMIT_FAILED', message: 'Failed to submit offer details', details: error.message } });
  }
};

// ── POST /api/onboarding/documents-complete ────────────────────────────

export const completeDocumentsStep = async (req: Request, res: Response): Promise<void> => {
  const employeeId = req.user?.employeeId;
  if (!employeeId) {
    res.status(400).json({ error: { code: 'NO_EMPLOYEE', message: 'No employee profile linked to this user' } });
    return;
  }

  try {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' } });
      return;
    }

    const updated = await prisma.employee.update({
      where: { id: employeeId },
      data: {
        onboardingStep: Math.max(employee.onboardingStep, 5),
      },
    });

    res.json({ data: updated });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'UPDATE_FAILED', message: 'Failed to complete documents step', details: error.message } });
  }
};

// ── POST /api/onboarding/complete ─────────────────────────────

export const completeOnboarding = async (req: Request, res: Response): Promise<void> => {
  const employeeId = req.user?.employeeId;
  if (!employeeId) {
    res.status(400).json({ error: { code: 'NO_EMPLOYEE', message: 'No employee profile linked to this user' } });
    return;
  }

  try {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        documents: {
          select: { type: true },
        },
      },
    });

    if (!employee) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' } });
      return;
    }

    // Validate all required fields
    const missing: string[] = [];

    // Step 1: Personal Info
    if (!employee.firstName) missing.push('firstName');
    if (!employee.lastName) missing.push('lastName');
    if (!employee.dateOfBirth) missing.push('dateOfBirth');
    if (!employee.gender) missing.push('gender');
    if (!employee.phone) missing.push('phone');

    // Step 2: Address
    if (!employee.currentAddress) missing.push('currentAddress');
    if (!employee.permanentAddress) missing.push('permanentAddress');

    // Step 3: Emergency Contact
    if (!employee.emergencyContactName) missing.push('emergencyContactName');
    if (!employee.emergencyContactRel) missing.push('emergencyContactRel');
    if (!employee.emergencyContactPhone) missing.push('emergencyContactPhone');

    // Step 4: Bank Details
    if (!employee.bankName) missing.push('bankName');
    if (!employee.bankAccountNumber) missing.push('bankAccountNumber');
    if (!employee.bankIFSC) missing.push('bankIFSC');
    if (!employee.bankAccountHolder) missing.push('bankAccountHolder');

    // Documents check
    const uploadedTypes = employee.documents.map((d) => d.type);
    if (!uploadedTypes.includes('PAN_CARD')) missing.push('PAN_CARD document');
    if (!uploadedTypes.includes('AADHAAR')) missing.push('AADHAAR document');
    if (!uploadedTypes.includes('PROFILE_PHOTO')) missing.push('PROFILE_PHOTO document');
    if (!uploadedTypes.includes('FITNESS_CERTIFICATE')) missing.push('FITNESS_CERTIFICATE document');
    if (!uploadedTypes.includes('EDUCATION_CERT')) missing.push('EDUCATION_CERT document');

    // Step 5: Offer letter signed
    if (!employee.offerLetterSignedAt) missing.push('offerLetterSignedAt');

    if (missing.length > 0) {
      res.status(400).json({
        error: {
          code: 'INCOMPLETE_ONBOARDING',
          message: 'Please complete all required steps before finalizing onboarding',
          missing,
        },
      });
      return;
    }

    // All validations passed — generate Employee ID and mark active
    const updatedEmployee = await prisma.$transaction(async (tx) => {
      let finalEmployeeCode = employee.employeeCode;
      
      // If code doesn't exist, generate it
      if (!finalEmployeeCode) {
        const seq = await tx.globalSequence.findUnique({ where: { id: 1 } });
        if (!seq) throw new Error('Global sequence not initialized');
        
        const current = seq.nextValue;
        await tx.globalSequence.update({
          where: { id: 1 },
          data: { nextValue: current + 1 },
        });

        // Get department to get codeInitial
        const department = await tx.department.findUnique({ where: { id: employee.departmentId } });
        const codeInitial = department?.codeInitial || 'X';
        
        finalEmployeeCode = `NAP${codeInitial}-${current.toString().padStart(4, '0')}`;
      }

      const completedAt = new Date();
      const endsAt = new Date(completedAt);
      endsAt.setMonth(endsAt.getMonth() + 3);

      const emp = await tx.employee.update({
        where: { id: employeeId },
        data: { 
          isProfileComplete: true,
          profileCompletedAt: completedAt,
          probationEndsAt: endsAt,
          status: 'ACTIVE',
          employeeCode: finalEmployeeCode,
        },
        include: { user: true }
      });

      // Update user status
      await tx.user.update({
        where: { id: employee.userId },
        data: { status: 'ACTIVE' },
      });

      // Add history record
      await tx.employeeStatusHistory.create({
        data: {
          employeeId: employeeId,
          fromStatus: employee.status,
          toStatus: 'ACTIVE',
          reason: 'Onboarding completed',
          changedById: req.user?.userId || null,
        },
      });

      return emp;
    });

    // Notify HR Admins
    const hrUserIds = await getHRAdminUserIds();
    await broadcastToRole({
      role: 'HR_ADMIN',
      userIds: hrUserIds,
      title: '🎉 Onboarding Completed',
      message: `${updatedEmployee.firstName} ${updatedEmployee.lastName} has completed their onboarding.`,
      type: 'SYSTEM',
      linkUrl: `/admin/employees/${employeeId}`,
    });

    // Send completion email
    if (updatedEmployee && updatedEmployee.user) {
      sendEmail({
        to: updatedEmployee.user.email,
        subject: 'Welcome to Nirvigh Advisors - Onboarding Complete',
        html: `
          <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
            <div style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); padding: 40px 30px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 10px;">🎉</div>
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Onboarding Complete!</h1>
              <p style="color: #ccfbf1; margin: 10px 0 0; font-size: 16px;">Welcome to the team, ${updatedEmployee.firstName}</p>
            </div>
            
            <div style="padding: 40px 30px; background-color: #ffffff;">
              <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-top: 0;">Hi ${updatedEmployee.firstName},</p>
              <p style="color: #334155; font-size: 16px; line-height: 1.6;">Congratulations! You have successfully submitted your onboarding profile to HR. Your employee account is now fully activated.</p>
              
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <h3 style="margin: 0 0 15px 0; color: #0f172a; font-size: 16px;">Your Employee Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 40%;">Name</td>
                    <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 600;">${updatedEmployee.firstName} ${updatedEmployee.lastName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; font-size: 14px; border-top: 1px solid #f1f5f9;">Employee ID</td>
                    <td style="padding: 8px 0; color: #0d9488; font-size: 15px; font-weight: 700; border-top: 1px solid #f1f5f9;">${updatedEmployee.employeeCode}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; font-size: 14px; border-top: 1px solid #f1f5f9;">Company</td>
                    <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 600; border-top: 1px solid #f1f5f9;">Nirvigh Advisors</td>
                  </tr>
                </table>
              </div>

              <div style="background-color: #fefce8; border-left: 4px solid #eab308; padding: 20px; margin: 30px 0; border-radius: 0 8px 8px 0;">
                <p style="color: #854d0e; margin: 0; font-weight: 600; font-size: 15px;">What's Next?</p>
                <p style="color: #a16207; margin: 5px 0 0; font-size: 14px; line-height: 1.5;">The HR Admin will now verify your details and generate your final <strong>Offer Letter</strong>. Once uploaded, you will be able to view and download it directly from your dashboard.</p>
              </div>
              
              <div style="text-align: center; margin: 35px 0 10px;">
                <a href="${config.appUrl}/login" style="display: inline-block; padding: 14px 32px; background-color: #0f172a; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; transition: background-color 0.3s ease;">Login to Dashboard</a>
              </div>
            </div>
            
            <div style="background-color: #f1f5f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} Nirvigh Advisors. All rights reserved.</p>
            </div>
          </div>
        `
      });
    }

    res.json({
      data: {
        message: 'Onboarding completed successfully',
        isProfileComplete: true,
        employeeCode: updatedEmployee?.employeeCode,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'COMPLETE_FAILED', message: 'Failed to complete onboarding', details: error.message } });
  }
};
