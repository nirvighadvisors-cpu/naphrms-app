import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { departmentApi } from './department-api';
import { useToast } from '@/hooks/use-toast';

export const useDepartments = () => {
  return useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentApi.list(),
    staleTime: 10 * 60 * 1000, // departments rarely change
  });
};

export const useCreateDepartment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: departmentApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast({ title: 'Department created', description: 'New department added successfully.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create department',
        description: error?.response?.data?.error?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
};
