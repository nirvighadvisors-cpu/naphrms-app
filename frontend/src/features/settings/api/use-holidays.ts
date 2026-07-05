import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { holidaysApi } from './holidays-api';
import { useToast } from '@/hooks/use-toast';

export const holidayKeys = {
  all: ['holidays'] as const,
  byYear: (year?: number) => [...holidayKeys.all, { year }] as const,
};

export function useHolidays(year?: number) {
  return useQuery({
    queryKey: holidayKeys.byYear(year),
    queryFn: () => holidaysApi.getAll(year),
  });
}

export function useCreateHoliday() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: holidaysApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: holidayKeys.all });
      toast({ title: 'Success', description: 'Holiday created' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.error?.message || 'Failed to create', variant: 'destructive' });
    },
  });
}

export function useUpdateHoliday() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => holidaysApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: holidayKeys.all });
      toast({ title: 'Success', description: 'Holiday updated' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.error?.message || 'Failed to update', variant: 'destructive' });
    },
  });
}

export function useDeleteHoliday() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: holidaysApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: holidayKeys.all });
      toast({ title: 'Success', description: 'Holiday deleted' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.error?.message || 'Failed to delete', variant: 'destructive' });
    },
  });
}

