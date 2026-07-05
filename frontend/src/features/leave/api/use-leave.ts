import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveApi } from './leave-api';
import { useToast } from '@/hooks/use-toast';

// ── Queries ───────────────────────────────────────────────────

export const useLeaveTypes = () => {
  return useQuery({
    queryKey: ['leave', 'types'],
    queryFn: () => leaveApi.getLeaveTypes(),
  });
};

export const useMyBalances = () => {
  return useQuery({
    queryKey: ['leave', 'balances', 'my'],
    queryFn: () => leaveApi.getMyBalances(),
  });
};

export const useAllBalances = (params: { employeeId?: string; year?: number }) => {
  return useQuery({
    queryKey: ['leave', 'balances', 'all', params],
    queryFn: () => leaveApi.getAllBalances(params),
  });
};

export const useMyLeaves = (params: { status?: string; page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ['leave', 'my', params],
    queryFn: () => leaveApi.getMyLeaves(params),
  });
};

export const useAllLeaveRequests = (params: {
  status?: string;
  employeeId?: string;
  leaveTypeId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ['leave', 'requests', params],
    queryFn: () => leaveApi.getAllLeaveRequests(params),
  });
};

export const useLeaveSummary = () => {
  return useQuery({
    queryKey: ['leave', 'summary'],
    queryFn: () => leaveApi.getLeaveSummary(),
  });
};

// ── Mutations ─────────────────────────────────────────────────

export const useApplyLeave = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: { leaveTypeId: string; startDate: string; endDate: string; reason: string; attachment?: string }) =>
      leaveApi.applyLeave(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave', 'my'] });
      queryClient.invalidateQueries({ queryKey: ['leave', 'balances'] });
      toast({ title: 'Leave applied', description: 'Your leave request has been submitted for approval.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to apply leave',
        description: error?.response?.data?.error?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
};

export const useReviewLeave = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status: string; remarks?: string } }) =>
      leaveApi.reviewLeave(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave', 'requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave', 'summary'] });
      toast({ title: 'Leave reviewed', description: 'The leave request has been updated.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to review leave',
        description: error?.response?.data?.error?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
};

export const useCancelLeave = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => leaveApi.cancelLeave(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave', 'my'] });
      queryClient.invalidateQueries({ queryKey: ['leave', 'balances'] });
      toast({ title: 'Leave cancelled', description: 'Your leave request has been cancelled.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to cancel leave',
        description: error?.response?.data?.error?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
};

export const useInitializeBalances = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: { year: number; employeeIds?: string[] }) => leaveApi.initializeBalances(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave', 'balances'] });
      toast({ title: 'Balances initialized', description: 'Leave balances have been set up for the selected year.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to initialize balances',
        description: error?.response?.data?.error?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
};

export const useCreateLeaveType = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: Partial<import('./leave-api').LeaveType>) => leaveApi.createLeaveType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave', 'types'] });
      toast({ title: 'Leave type created', description: 'New leave type has been added successfully.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create leave type',
        description: error?.response?.data?.error?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateLeaveType = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<import('./leave-api').LeaveType> }) =>
      leaveApi.updateLeaveType(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave', 'types'] });
      toast({ title: 'Leave type updated', description: 'Leave type has been updated successfully.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update leave type',
        description: error?.response?.data?.error?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteLeaveType = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => leaveApi.deleteLeaveType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave', 'types'] });
      toast({ title: 'Leave type deleted', description: 'Leave type has been removed.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete leave type',
        description: error?.response?.data?.error?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
};

export const useUploadLeaveAttachment = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (file: File) => leaveApi.uploadAttachment(file),
    onError: (error: any) => {
      toast({
        title: 'Failed to upload document',
        description: error?.response?.data?.error?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
};
