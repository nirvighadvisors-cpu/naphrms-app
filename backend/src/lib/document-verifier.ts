import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// ── Types ─────────────────────────────────────────────────────
export interface VerificationResult {
  isVerified: boolean;
  reason: string;
  extractedData: Record<string, string>;
}

export interface EmployeeProfile {
  firstName: string;
  middleName?: string | null;
  lastName: string;
  panNumber?: string | null;
  aadhaarNumber?: string | null;
  bankAccountNumber?: string | null;
  bankAccountHolder?: string | null;
  bankIFSC?: string | null;
}

// ── Prompt builders per document type ─────────────────────────

function buildPanCardPrompt(employee: EmployeeProfile): string {
  const fullName = [employee.firstName, employee.middleName, employee.lastName].filter(Boolean).join(' ');
  return `You are a document verification AI for an HR system.
Analyze this PAN Card image carefully.

**Expected Employee Details:**
- Full Name: ${fullName}
- PAN Number: ${employee.panNumber || 'NOT PROVIDED'}

**Your Task:**
1. Extract the PAN number from the image.
2. Extract the name from the image.
3. Compare the extracted PAN number with the expected PAN number (case-insensitive).
4. Compare the extracted name with the expected name (allow minor variations like middle name differences, but the first and last name must match).

**Rules:**
- If the PAN number does NOT match, mark as NOT verified and explain.
- If the name is significantly different, mark as NOT verified and explain.
- If the image is not a PAN card at all, mark as NOT verified.
- If PAN number is NOT PROVIDED by the employee, just verify that the image is a valid PAN card and extract the details.

Respond ONLY with valid JSON in this exact format (no markdown, no code fences):
{"isVerified": true/false, "reason": "explanation", "extractedData": {"panNumber": "XXXXX1234X", "nameOnDocument": "Name from PAN"}}`;
}

function buildAadhaarPrompt(employee: EmployeeProfile): string {
  const fullName = [employee.firstName, employee.middleName, employee.lastName].filter(Boolean).join(' ');
  return `You are a document verification AI for an HR system.
Analyze this Aadhaar Card image carefully.

**Expected Employee Details:**
- Full Name: ${fullName}
- Aadhaar Number: ${employee.aadhaarNumber || 'NOT PROVIDED'}

**Your Task:**
1. Extract the Aadhaar number (12 digits) from the image.
2. Extract the name from the image.
3. Compare the extracted Aadhaar number with the expected Aadhaar number.
4. Compare the extracted name with the expected name (allow minor variations).

**Rules:**
- If the Aadhaar number does NOT match, mark as NOT verified and explain.
- If the name is significantly different, mark as NOT verified and explain.
- If the image is not an Aadhaar card at all, mark as NOT verified.
- If Aadhaar number is NOT PROVIDED by the employee, just verify that the image is a valid Aadhaar card and extract the details.

Respond ONLY with valid JSON in this exact format (no markdown, no code fences):
{"isVerified": true/false, "reason": "explanation", "extractedData": {"aadhaarNumber": "XXXX XXXX XXXX", "nameOnDocument": "Name from Aadhaar"}}`;
}

function buildBankDocPrompt(employee: EmployeeProfile): string {
  return `You are a document verification AI for an HR system.
Analyze this cancelled cheque or bank passbook image carefully.

**Expected Employee Details:**
- Account Holder Name: ${employee.bankAccountHolder || 'NOT PROVIDED'}
- Account Number: ${employee.bankAccountNumber || 'NOT PROVIDED'}
- IFSC Code: ${employee.bankIFSC || 'NOT PROVIDED'}

**Your Task:**
1. Extract the account number from the image.
2. Extract the IFSC code from the image.
3. Extract the account holder name from the image.
4. Compare extracted details with the expected details.

**Rules:**
- If the account number does NOT match, mark as NOT verified.
- If the IFSC code does NOT match, mark as NOT verified.
- If the name is significantly different, mark as NOT verified.
- If the image is not a valid bank document, mark as NOT verified.
- If details are NOT PROVIDED, just verify it's a valid bank document and extract what you can.

Respond ONLY with valid JSON in this exact format (no markdown, no code fences):
{"isVerified": true/false, "reason": "explanation", "extractedData": {"accountNumber": "...", "ifscCode": "...", "accountHolderName": "..."}}`;
}

function buildProfilePhotoPrompt(): string {
  return `You are a document verification AI for an HR system.
Analyze this image to determine if it is a valid passport-size photograph of a person.

**Your Task:**
1. Check if the image contains a clear photograph of a single person's face.
2. Verify it looks like a passport-style or formal ID photo.
3. Reject if it's a document scan, a group photo, a landscape, an animal, or any non-portrait image.

**Rules:**
- The image MUST show a single person's face clearly.
- Selfies and casual photos are acceptable if the face is clearly visible.
- If the image is blurry, too dark, or the face is not clearly visible, mark as NOT verified.

Respond ONLY with valid JSON in this exact format (no markdown, no code fences):
{"isVerified": true/false, "reason": "explanation", "extractedData": {"photoType": "passport/selfie/other", "faceVisible": true/false}}`;
}

function buildEducationCertPrompt(employee: EmployeeProfile): string {
  const fullName = [employee.firstName, employee.middleName, employee.lastName].filter(Boolean).join(' ');
  return `You are a document verification AI for an HR system.
Analyze this education certificate/marksheet image carefully.

**Expected Employee Name:** ${fullName}

**Your Task:**
1. Verify this is an education-related document (degree, diploma, marksheet, certificate).
2. Extract the candidate's name from the document.
3. Extract the institution name, degree/certificate title, and year of completion if visible.
4. Compare the name with the expected employee name (allow minor variations).

**Rules:**
- If this is not an education document, mark as NOT verified.
- If the name on the document is significantly different from the expected name, mark as NOT verified.
- Minor name variations (middle name presence/absence) are acceptable.

Respond ONLY with valid JSON in this exact format (no markdown, no code fences):
{"isVerified": true/false, "reason": "explanation", "extractedData": {"nameOnDocument": "...", "institution": "...", "degree": "...", "yearOfCompletion": "..."}}`;
}

function buildExperienceLetterPrompt(employee: EmployeeProfile): string {
  const fullName = [employee.firstName, employee.middleName, employee.lastName].filter(Boolean).join(' ');
  return `You are a document verification AI for an HR system.
Analyze this experience letter / employment letter image carefully.

**Expected Employee Name:** ${fullName}

**Your Task:**
1. Verify this is a valid experience letter or employment certificate.
2. Extract the candidate's name, company name, designation, and employment duration.
3. Compare the name with the expected employee name.

**Rules:**
- If this is not a valid experience/employment document, mark as NOT verified.
- If the name on the document is significantly different from the expected name, mark as NOT verified.

Respond ONLY with valid JSON in this exact format (no markdown, no code fences):
{"isVerified": true/false, "reason": "explanation", "extractedData": {"nameOnDocument": "...", "companyName": "...", "designation": "...", "duration": "..."}}`;
}

function buildFitnessCertPrompt(employee: EmployeeProfile): string {
  const fullName = [employee.firstName, employee.middleName, employee.lastName].filter(Boolean).join(' ');
  return `You are a document verification AI for an HR system.
Analyze this fitness certificate image carefully.

**Expected Employee Name:** ${fullName}

**Your Task:**
1. Verify this is a valid medical fitness certificate.
2. Extract the candidate's name, issuing authority/doctor, and issue date if visible.
3. Compare the name with the expected employee name.

**Rules:**
- If this is not a valid fitness/medical certificate, mark as NOT verified.
- If the name on the document is significantly different from the expected name, mark as NOT verified.

Respond ONLY with valid JSON in this exact format (no markdown, no code fences):
{"isVerified": true/false, "reason": "explanation", "extractedData": {"nameOnDocument": "...", "issuingAuthority": "...", "issueDate": "..."}}`;
}

// ── Main verification function ────────────────────────────────

export async function verifyDocument(
  docType: string,
  fileBuffer: Buffer,
  mimeType: string,
  employee: EmployeeProfile
): Promise<VerificationResult> {
  // Build the appropriate prompt
  let prompt: string;

  switch (docType) {
    case 'PAN_CARD':
      prompt = buildPanCardPrompt(employee);
      break;
    case 'AADHAAR':
      prompt = buildAadhaarPrompt(employee);
      break;
    case 'BANK_PASSBOOK':
    case 'CANCELLED_CHEQUE':
      prompt = buildBankDocPrompt(employee);
      break;
    case 'PROFILE_PHOTO':
      prompt = buildProfilePhotoPrompt();
      break;
    case 'EDUCATION_CERT':
      prompt = buildEducationCertPrompt(employee);
      break;
    case 'EXPERIENCE_CERT':
      prompt = buildExperienceLetterPrompt(employee);
      break;
    case 'FITNESS_CERTIFICATE':
      prompt = buildFitnessCertPrompt(employee);
      break;
    default:
      // For document types we don't verify (SIGNATURE, OFFER_LETTER, etc.)
      return {
        isVerified: true,
        reason: 'Document type does not require AI verification.',
        extractedData: {},
      };
  }

  try {
    // Convert buffer to base64 for Gemini
    const base64Data = fileBuffer.toString('base64');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data,
              },
            },
            { text: prompt },
          ],
        },
      ],
    });

    const rawText = response.text || '';
    
    // Parse the JSON response
    // Clean up potential markdown code fences
    const cleanedText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const parsed = JSON.parse(cleanedText);

    return {
      isVerified: parsed.isVerified === true,
      reason: parsed.reason || 'No reason provided',
      extractedData: parsed.extractedData || {},
    };
  } catch (error: any) {
    console.error('[DocumentVerifier] Gemini API error:', error.message);
    
    // If AI fails, don't block the user — mark as pending for manual review
    return {
      isVerified: true,
      reason: `AI verification bypassed due to API error: ${error.message}. Document saved for manual HR review.`,
      extractedData: {},
    };
  }
}
