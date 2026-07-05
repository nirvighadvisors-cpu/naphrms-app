import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// Admin Hooks
export function useAllSurveys() {
  return useQuery({
    queryKey: ['surveys', 'all'],
    queryFn: async () => {
      const res = await apiClient.get('/api/surveys/admin/all');
      return res.data.data;
    },
  });
}

export function useCreateSurvey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiClient.post('/api/surveys', data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['surveys', 'active'] });
    },
  });
}

export function useSurveyResponses(id: string) {
  return useQuery({
    queryKey: ['surveys', id, 'responses'],
    queryFn: async () => {
      const res = await apiClient.get(`/api/surveys/${id}/responses`);
      return res.data.data;
    },
    enabled: !!id,
  });
}

// Employee Hooks
export function useActiveSurveys() {
  return useQuery({
    queryKey: ['surveys', 'active'],
    queryFn: async () => {
      const res = await apiClient.get('/api/surveys/active');
      return res.data.data;
    },
  });
}

export function useSurveyDetails(id: string) {
  return useQuery({
    queryKey: ['surveys', id],
    queryFn: async () => {
      const res = await apiClient.get(`/api/surveys/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useSubmitSurvey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, answers }: { id: string; answers: any[] }) => {
      const res = await apiClient.post(`/api/surveys/${id}/submit`, { answers });
      return res.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['surveys', 'active'] });
      queryClient.invalidateQueries({ queryKey: ['surveys', variables.id, 'responses'] });
    },
  });
}
