import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recognitionApi } from './recognition-api';
import { useToast } from '@/hooks/use-toast';

export const useBadges = (includeInactive?: boolean) => {
  return useQuery({
    queryKey: ['recognition', 'badges', includeInactive],
    queryFn: () => recognitionApi.getBadges(includeInactive),
  });
};

export const useRecognitionFeed = (params: { page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ['recognition', 'feed', params],
    queryFn: () => recognitionApi.getFeed(params),
  });
};

export const useSendRecognition = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: recognitionApi.sendRecognition,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recognition', 'feed'] });
      toast({ title: 'Recognition sent!', description: 'Your shoutout has been posted.' });
    },
    onError: (err: any) => {
      toast({
        title: 'Failed to send recognition',
        description: err?.response?.data?.error?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
};

export const useCreateBadge = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: recognitionApi.createBadge,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recognition', 'badges'] });
      toast({ title: 'Badge created', description: 'New recognition badge added.' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err?.response?.data?.error?.message || 'An error occurred', variant: 'destructive' });
    },
  });
};

export const useUpdateBadge = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => recognitionApi.updateBadge(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recognition', 'badges'] });
      toast({ title: 'Badge updated', description: 'Badge settings saved.' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err?.response?.data?.error?.message || 'An error occurred', variant: 'destructive' });
    },
  });
};
