import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timesheetApi } from './timesheet-api';
import { useToast } from '@/hooks/use-toast';

export const timesheetKeys = {
  all: ['timesheets'] as const,
  my: () => [...timesheetKeys.all, 'my'] as const,
  allLogs: (params: any) => [...timesheetKeys.all, 'all-logs', params] as const,
};

export function useMyLogs() {
  return useQuery({
    queryKey: timesheetKeys.my(),
    queryFn: timesheetApi.getMyLogs,
  });
}

export function useAllLogs(params?: { date?: string; employeeId?: string }) {
  return useQuery({
    queryKey: timesheetKeys.allLogs(params),
    queryFn: () => timesheetApi.getAllLogs(params),
  });
}

export function useSubmitLog() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: timesheetApi.submitLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timesheetKeys.my() });
      queryClient.invalidateQueries({ queryKey: timesheetKeys.all });
      toast({ title: 'Success', description: 'Daily log submitted successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.response?.data?.error?.message || 'Failed to submit log', 
        variant: 'destructive' 
      });
    },
  });
}
