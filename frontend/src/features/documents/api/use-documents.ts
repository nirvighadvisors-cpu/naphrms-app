import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentApi } from './documents-api';
import type { UploadDocumentInput, CreatePolicyInput } from './documents-api';
import { useToast } from '@/hooks/use-toast';

export const documentKeys = {
  all: ['documents'] as const,
  my: () => [...documentKeys.all, 'my'] as const,
  employee: (id: string) => [...documentKeys.all, 'employee', id] as const,
  policies: () => [...documentKeys.all, 'policies'] as const,
};

// ── Queries ────────────────────────────────────────

export function useMyDocuments() {
  return useQuery({
    queryKey: documentKeys.my(),
    queryFn: documentApi.getMyDocuments,
  });
}

export function useEmployeeDocuments(employeeId: string) {
  return useQuery({
    queryKey: documentKeys.employee(employeeId),
    queryFn: () => documentApi.getEmployeeDocuments(employeeId),
    enabled: !!employeeId,
  });
}

export function usePolicies() {
  return useQuery({
    queryKey: documentKeys.policies(),
    queryFn: documentApi.getPolicies,
  });
}

// ── Mutations ──────────────────────────────────────

export function useUploadMyDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: documentApi.uploadMyDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.my() });
      toast({ title: 'Success', description: 'Document uploaded successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.error?.message || 'Failed to upload document', variant: 'default' });
    },
  });
}

export function useUploadEmployeeDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ employeeId, data }: { employeeId: string; data: UploadDocumentInput }) => 
      documentApi.uploadEmployeeDocument(employeeId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: documentKeys.employee(variables.employeeId) });
      toast({ title: 'Success', description: 'Document uploaded successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.error?.message || 'Failed to upload document', variant: 'default' });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: documentApi.deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.all });
      toast({ title: 'Success', description: 'Document deleted successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.error?.message || 'Failed to delete document', variant: 'default' });
    },
  });
}

export function useCreatePolicy() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: documentApi.createPolicy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.policies() });
      toast({ title: 'Success', description: 'Policy published successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.error?.message || 'Failed to publish policy', variant: 'default' });
    },
  });
}

export function useUpdatePolicy() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => 
      documentApi.updatePolicy(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.policies() });
      toast({ title: 'Success', description: 'Policy updated successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.error?.message || 'Failed to update policy', variant: 'default' });
    },
  });
}

export function useDeletePolicy() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: documentApi.deletePolicy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.policies() });
      toast({ title: 'Success', description: 'Policy deleted successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.error?.message || 'Failed to delete policy', variant: 'default' });
    },
  });
}

export function useReplaceEmployeeDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { fileName: string; fileUrl: string; fileSize?: number } }) => 
      documentApi.replaceEmployeeDocument(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.all });
      toast({ title: 'Success', description: 'Document replaced successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.error?.message || 'Failed to replace document', variant: 'default' });
    },
  });
}

export function useReplacePolicy() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { fileUrl: string; version: string } }) => 
      documentApi.replacePolicy(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.policies() });
      toast({ title: 'Success', description: 'Policy replaced successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.error?.message || 'Failed to replace policy', variant: 'default' });
    },
  });
}
