import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api-client';

export interface PolicyDocument {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string;
  version: string;
  isActive: boolean;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

// Get all active policies
export const usePolicies = () => {
  return useQuery({
    queryKey: ['policies'],
    queryFn: async () => {
      const response = await api.get('/policies');
      return response.data.data as PolicyDocument[];
    },
  });
};

// Upload a new policy
export const useUploadPolicy = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ title, description, file }: { title: string; description?: string; file: File }) => {
      const formData = new FormData();
      formData.append('title', title);
      if (description) formData.append('description', description);
      formData.append('file', file);

      const response = await api.post('/policies', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data.data as PolicyDocument;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
    },
  });
};

// Delete a policy
export const useDeletePolicy = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/policies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
    },
  });
};
