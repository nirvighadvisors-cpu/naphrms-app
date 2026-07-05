import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from './settings-api';
import { useToast } from '@/hooks/use-toast';

export const settingKeys = {
  all: ['settings'] as const,
};

export function useSettings() {
  return useQuery({
    queryKey: settingKeys.all,
    queryFn: settingsApi.getAll,
  });
}

export function useUpsertSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: settingsApi.upsert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingKeys.all });
      toast({ title: 'Success', description: 'Settings updated successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.response?.data?.error?.message || 'Failed to update settings', 
        variant: 'destructive' 
      });
    },
  });
}
