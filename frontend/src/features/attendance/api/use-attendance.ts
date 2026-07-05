import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceApi } from './attendance-api';
import { useToast } from '@/hooks/use-toast';

export const useTodayAttendance = () => {
  return useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: () => attendanceApi.getToday(),
  });
};

export const useMyAttendance = (params: { startDate?: string; endDate?: string; page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ['attendance', 'my', params],
    queryFn: () => attendanceApi.getMyAttendance(params),
  });
};

export const useAllAttendance = (params: { startDate?: string; endDate?: string; date?: string; employeeId?: string; departmentId?: string; status?: string; page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ['attendance', 'all', params],
    queryFn: () => attendanceApi.getAllAttendance(params),
  });
};

export const useAttendanceSummary = (date?: string) => {
  return useQuery({
    queryKey: ['attendance', 'summary', date],
    queryFn: () => attendanceApi.getSummary(date),
  });
};

export const useAttendanceAnalytics = (employeeId?: string) => {
  return useQuery({
    queryKey: ['attendance', 'analytics', employeeId],
    queryFn: () => attendanceApi.getAnalytics(employeeId),
  });
};

export const usePunchIn = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: { lat?: number; lng?: number; workSiteId?: string; photoBase64: string }) => attendanceApi.punchIn(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'today'] });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'my'] });
      toast({ title: 'Punched in successfully', description: 'Your attendance has been recorded.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Punch In Failed',
        description: error?.response?.data?.error?.message || 'Could not punch in',
        variant: 'destructive',
      });
    },
  });
};

export const usePunchOut = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: { lat?: number; lng?: number; photoBase64: string }) => attendanceApi.punchOut(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'today'] });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'my'] });
      toast({ title: 'Punched out successfully', description: 'Your work hours have been calculated.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Punch Out Failed',
        description: error?.response?.data?.error?.message || 'Could not punch out',
        variant: 'destructive',
      });
    },
  });
};

export const useMarkAttendance = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: { employeeId: string; date: string; status: string }) => attendanceApi.markAttendance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'summary'] });
      toast({ title: 'Attendance marked', description: 'Record updated successfully.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to mark attendance',
        description: error?.response?.data?.error?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
};

export const useCreateRegularization = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: { attendanceId?: string; date?: string; type?: 'REGULAR' | 'WFH'; reason: string; requestedIn?: string; requestedOut?: string }) => attendanceApi.createRegularization(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'my'] });
      toast({ title: 'Request submitted', description: 'Your regularization request has been sent to HR.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to submit request',
        description: error?.response?.data?.error?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
};

export const usePendingRegularizations = (params: { page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ['attendance', 'regularizations', 'pending', params],
    queryFn: () => attendanceApi.getPendingRegularizations(params),
  });
};

export const useReviewRegularization = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status: 'APPROVED' | 'REJECTED'; remarks?: string } }) => attendanceApi.reviewRegularization(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'regularizations', 'pending'] });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'all'] });
      toast({ title: 'Request reviewed', description: 'The regularization request has been updated.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to review request',
        description: error?.response?.data?.error?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
};

export const useExtendPunchOut = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: { extensionMinutes: number }) => attendanceApi.extendPunchOut(data),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'today'] });
      toast({ title: 'Time Extended', description: response.message || 'Your punch-out deadline has been extended.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Extension Failed',
        description: error?.response?.data?.error?.message || 'Could not extend time',
        variant: 'destructive',
      });
    },
  });
};
