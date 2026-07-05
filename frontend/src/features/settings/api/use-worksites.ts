import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { worksitesApi } from './worksites-api';
import { useToast } from '@/hooks/use-toast';

export const worksiteKeys = {
  all: ['worksites'] as const,
};

export function useWorksites() {
  return useQuery({
    queryKey: worksiteKeys.all,
    queryFn: worksitesApi.getAll,
  });
}

export function useCreateWorksite() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: worksitesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: worksiteKeys.all });
      toast({ title: 'Success', description: 'Work site created' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.error?.message || 'Failed to create', variant: 'destructive' });
    },
  });
}

export function useUpdateWorksite() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => worksitesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: worksiteKeys.all });
      toast({ title: 'Success', description: 'Work site updated' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.error?.message || 'Failed to update', variant: 'destructive' });
    },
  });
}

export function useDeleteWorksite() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: worksitesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: worksiteKeys.all });
      toast({ title: 'Success', description: 'Work site deleted' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.error?.message || 'Failed to delete', variant: 'destructive' });
    },
  });
}
