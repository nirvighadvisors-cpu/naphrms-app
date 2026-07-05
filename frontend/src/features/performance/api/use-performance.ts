import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { performanceApi, type CycleStatus, type GoalStatus, type ReviewStatus } from './performance-api';
import { useToast } from '@/hooks/use-toast';

// ── Queries ───────────────────────────────────────────────────

export const useCycles = (params?: { status?: CycleStatus }) => {
  return useQuery({
    queryKey: ['performance', 'cycles', params],
    queryFn: () => performanceApi.getCycles(params),
  });
};

export const useActiveCycle = () => {
  return useQuery({
    queryKey: ['performance', 'cycles', 'active'],
    queryFn: () => performanceApi.getActiveCycle(),
    retry: false, // Don't retry if 404 (no active cycle)
  });
};

export const useMyGoals = (cycleId?: string) => {
  return useQuery({
    queryKey: ['performance', 'goals', 'my', cycleId],
    queryFn: () => performanceApi.getMyGoals(cycleId),
    enabled: !!cycleId,
  });
};

export const useMyReview = (cycleId?: string) => {
  return useQuery({
    queryKey: ['performance', 'reviews', 'my', cycleId],
    queryFn: () => performanceApi.getMyReview(cycleId!),
    enabled: !!cycleId,
    retry: false,
  });
};

export const useAllReviews = (params: { cycleId?: string; status?: ReviewStatus; employeeId?: string; page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ['performance', 'reviews', 'all', params],
    queryFn: () => performanceApi.getAllReviews(params),
  });
};

export const usePerformanceSummary = () => {
  return useQuery({
    queryKey: ['performance', 'summary'],
    queryFn: () => performanceApi.getPerformanceSummary(),
  });
};

// ── Mutations ─────────────────────────────────────────────────

export const useCreateCycle = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: { name: string; startDate: string; endDate: string }) => performanceApi.createCycle(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance', 'cycles'] });
      queryClient.invalidateQueries({ queryKey: ['performance', 'summary'] });
      toast({ title: 'Review cycle created', description: 'New performance review cycle has started.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create cycle',
        description: error?.response?.data?.error?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateCycleStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: CycleStatus }) => performanceApi.updateCycleStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance', 'cycles'] });
      queryClient.invalidateQueries({ queryKey: ['performance', 'summary'] });
      toast({ title: 'Cycle status updated', description: 'Review cycle status has been changed.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update cycle',
        description: error?.response?.data?.error?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
};

export const useCreateGoal = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: { cycleId: string; title: string; description?: string; targetDate?: string }) => performanceApi.createGoal(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['performance', 'goals', 'my', variables.cycleId] });
      toast({ title: 'Goal created', description: 'New goal has been added successfully.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create goal',
        description: error?.response?.data?.error?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateGoalProgress = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data, cycleId }: { id: string; data: { progress: number; status: GoalStatus }; cycleId: string }) => 
      performanceApi.updateGoalProgress(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['performance', 'goals', 'my', variables.cycleId] });
      toast({ title: 'Goal updated', description: 'Goal progress has been saved.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update goal',
        description: error?.response?.data?.error?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
};

export const useSubmitSelfReview = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ cycleId, data }: { cycleId: string; data: { selfRating: number; selfComments: string } }) => 
      performanceApi.submitSelfReview(cycleId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['performance', 'reviews', 'my', variables.cycleId] });
      toast({ title: 'Self-review submitted', description: 'Your self-evaluation has been submitted successfully.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to submit review',
        description: error?.response?.data?.error?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
};

export const useSubmitHrReview = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { hrRating: number; hrComments: string; finalRating: number } }) => 
      performanceApi.submitHrReview(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance', 'reviews'] });
      queryClient.invalidateQueries({ queryKey: ['performance', 'summary'] });
      toast({ title: 'HR review submitted', description: 'The performance review has been completed.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to submit review',
        description: error?.response?.data?.error?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
};
