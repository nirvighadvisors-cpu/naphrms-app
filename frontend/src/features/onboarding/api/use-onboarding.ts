import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { onboardingApi } from './onboarding-api';
import type { PersonalInfoPayload, AddressPayload, EmergencyContactPayload, BankDetailsPayload, SignOfferPayload, OfferDetailsPayload } from './onboarding-api';
import { useToast } from '@/hooks/use-toast';

export const onboardingKeys = {
  status: ['onboarding', 'status'] as const,
};

export function useOnboardingStatus() {
  return useQuery({
    queryKey: onboardingKeys.status,
    queryFn: onboardingApi.getStatus,
  });
}

export function useUpdatePersonalInfo() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: PersonalInfoPayload) => onboardingApi.updatePersonalInfo(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: onboardingKeys.status });
      toast({ title: 'Saved', description: 'Personal information updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.error?.message || 'Failed to save', variant: 'destructive' }),
  });
}

export function useUpdateAddress() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: AddressPayload) => onboardingApi.updateAddress(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: onboardingKeys.status });
      toast({ title: 'Saved', description: 'Address details updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.error?.message || 'Failed to save', variant: 'destructive' }),
  });
}

export function useUpdateEmergencyContact() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: EmergencyContactPayload) => onboardingApi.updateEmergencyContact(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: onboardingKeys.status });
      toast({ title: 'Saved', description: 'Emergency contacts updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.error?.message || 'Failed to save', variant: 'destructive' }),
  });
}

export function useUpdateBankDetails() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: BankDetailsPayload) => onboardingApi.updateBankDetails(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: onboardingKeys.status });
      toast({ title: 'Saved', description: 'Bank details updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.error?.message || 'Failed to save', variant: 'destructive' }),
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ file, type }: { file: File; type: string }) => onboardingApi.uploadDocument(file, type),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: onboardingKeys.status });
      toast({ title: 'Uploaded', description: 'Document uploaded successfully' });
    },
    onError: (e: any) => toast({ title: 'Upload Failed', description: e.response?.data?.error?.message || 'Could not upload file', variant: 'destructive' }),
  });
}

export function useSignOffer() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: SignOfferPayload) => onboardingApi.signOffer(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: onboardingKeys.status });
      toast({ title: 'Signed', description: 'Offer letter signed successfully' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.error?.message || 'Failed to sign', variant: 'destructive' }),
  });
}

export function useSubmitOfferDetails() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: OfferDetailsPayload) => onboardingApi.submitOfferDetails(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: onboardingKeys.status });
      toast({ title: 'Submitted', description: 'Offer letter details submitted successfully' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.error?.message || 'Failed to submit offer details', variant: 'destructive' }),
  });
}

export function useCompleteDocuments() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: () => onboardingApi.completeDocuments(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: onboardingKeys.status });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.error?.message || 'Failed to complete documents step', variant: 'destructive' }),
  });
}

export function useCompleteOnboarding() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: () => onboardingApi.complete(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: onboardingKeys.status });
      toast({ title: '🎉 Onboarding Complete!', description: 'Welcome to Nirvigh Advisors' });
    },
    onError: (e: any) => {
      const errorData = e.response?.data?.error;
      const missingFields = errorData?.missing?.length > 0 ? `: ${errorData.missing.join(', ')}` : '';
      toast({ 
        title: 'Cannot Complete', 
        description: `${errorData?.message || 'Some required fields are missing'}${missingFields}`, 
        variant: 'destructive' 
      });
    },
  });
}
