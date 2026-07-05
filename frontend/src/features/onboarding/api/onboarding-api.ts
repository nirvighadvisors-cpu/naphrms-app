import apiClient from '@/lib/api-client';

export interface OnboardingStatus {
  isProfileComplete: boolean;
  onboardingStep: number;
  firstName: string;
  middleName?: string;
  lastName: string;
  employeeCode: string;
  designation: string;
  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
  bloodGroup?: string;
  phone?: string;
  personalEmail?: string;
  currentAddress?: any;
  permanentAddress?: any;
  emergencyContactName?: string;
  emergencyContactRel?: string;
  emergencyContactPhone?: string;
  emergencyContact2Name?: string;
  emergencyContact2Rel?: string;
  emergencyContact2Phone?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIFSC?: string;
  bankAccountHolder?: string;
  bankBranch?: string;
  // Flags for each step
  personalInfoDone: boolean;
  addressDone: boolean;
  emergencyContactDone: boolean;
  bankDetailsDone: boolean;
  documentsDone: boolean;
  offerSigned: boolean;
  offerDetailsDone: boolean;
  // Offer letter context
  dateOfJoining?: string;
  department?: { name: string };
  manager?: { firstName: string; lastName: string };
  panNumber?: string;
  aadhaarNumber?: string;
  uanNumber?: string;
  offerLetterStatus?: string;
  offerLetterDetailsSubmittedAt?: string;
}

export interface AddressData {
  houseNo: string;
  building: string;
  street: string;
  landmark?: string;
  city: string;
  taluka: string;
  district: string;
  state: string;
  country: string;
  pinCode: string;
}

export interface PersonalInfoPayload {
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  bloodGroup?: string;
  phone: string;
  personalEmail?: string;
}

export interface AddressPayload {
  currentAddress: AddressData;
  permanentAddress: AddressData;
  sameAsCurrent?: boolean;
}

export interface EmergencyContactPayload {
  emergencyContactName: string;
  emergencyContactRel: string;
  emergencyContactPhone: string;
  emergencyContact2Name?: string;
  emergencyContact2Rel?: string;
  emergencyContact2Phone?: string;
}

export interface BankDetailsPayload {
  bankName: string;
  bankAccountHolder: string;
  bankAccountNumber: string;
  bankIFSC: string;
  bankBranch?: string;
}

export interface SignOfferPayload {
  signatureStoragePath: string;
  offerLetterHash: string;
  ipAddress: string;
  userAgent: string;
  policyAccepted: boolean;
}

export interface OfferDetailsPayload {
  panNumber: string;
  aadhaarNumber: string;
  uanNumber?: string;
}

export interface UploadedDocument {
  id: string;
  type: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  signedUrl?: string;
  createdAt: string;
}

export const onboardingApi = {
  getStatus: () =>
    apiClient.get<{ data: any }>('/onboarding/status').then(r => {
      const d = r.data.data;
      // Map backend shape to frontend OnboardingStatus
      return {
        ...d,
        personalInfoDone: d.steps?.personalInfo ?? false,
        addressDone: d.steps?.address ?? false,
        emergencyContactDone: d.steps?.emergencyContact ?? false,
        bankDetailsDone: d.steps?.bankDetails ?? false,
        documentsDone: d.steps?.documents ?? false,
        offerSigned: d.steps?.offerSigned ?? false,
        offerDetailsDone: d.steps?.offerDetailsDone ?? false,
      } as OnboardingStatus;
    }),

  updatePersonalInfo: (data: PersonalInfoPayload) =>
    apiClient.patch('/onboarding/personal', data).then(r => r.data.data),

  updateAddress: (data: AddressPayload) =>
    apiClient.patch('/onboarding/address', data).then(r => r.data.data),

  updateEmergencyContact: (data: EmergencyContactPayload) =>
    apiClient.patch('/onboarding/emergency', data).then(r => r.data.data),

  updateBankDetails: (data: BankDetailsPayload) =>
    apiClient.patch('/onboarding/bank', data).then(r => r.data.data),

  uploadDocument: (file: File, type: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    return apiClient.post<{ data: UploadedDocument }>('/onboarding/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data.data);
  },

  signOffer: (data: SignOfferPayload) =>
    apiClient.post('/onboarding/sign-offer', data).then(r => r.data.data),

  submitOfferDetails: (data: OfferDetailsPayload) =>
    apiClient.patch('/onboarding/offer-details', data).then(r => r.data.data),

  completeDocuments: () =>
    apiClient.post('/onboarding/documents-complete').then(r => r.data.data),

  complete: () =>
    apiClient.post('/onboarding/complete').then(r => r.data.data),
};
