import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { departmentsApi } from './departments-api';
import { useToast } from '@/hooks/use-toast';

export const departmentKeys = {
  all: ['departments'] as const,
};

export function useDepartments() {
  return useQuery({
    queryKey: departmentKeys.all,
    queryFn: departmentsApi.getAll,
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: departmentsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: departmentKeys.all });
      toast({ title: 'Success', description: 'Department created' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.error?.message || 'Failed to create', variant: 'destructive' });
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => departmentsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: departmentKeys.all });
      toast({ title: 'Success', description: 'Department updated' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.error?.message || 'Failed to update', variant: 'destructive' });
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: departmentsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: departmentKeys.all });
      toast({ title: 'Success', description: 'Department deleted' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.error?.message || 'Failed to delete', variant: 'destructive' });
    },
  });
}
