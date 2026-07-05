import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveTypesApi } from './leaves-api';
import { useToast } from '@/hooks/use-toast';

export const leaveKeys = {
  allTypes: ['leaveTypes'] as const,
};

export function useLeaveTypes() {
  return useQuery({
    queryKey: leaveKeys.allTypes,
    queryFn: leaveTypesApi.getAll,
  });
}

export function useCreateLeaveType() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: leaveTypesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.allTypes });
      toast({ title: 'Success', description: 'Leave type created' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.error?.message || 'Failed to create', variant: 'destructive' });
    },
  });
}

export function useUpdateLeaveType() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => leaveTypesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.allTypes });
      toast({ title: 'Success', description: 'Leave type updated' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.error?.message || 'Failed to update', variant: 'destructive' });
    },
  });
}

export function useDeleteLeaveType() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: leaveTypesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.allTypes });
      toast({ title: 'Success', description: 'Leave type deleted' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.error?.message || 'Failed to delete', variant: 'destructive' });
    },
  });
}
