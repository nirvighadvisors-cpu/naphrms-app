import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// Employee Hooks
export function useMyTickets() {
  return useQuery({
    queryKey: ['my-tickets'],
    queryFn: async () => {
      const res = await apiClient.get('tickets/my-tickets');
      return res.data.data;
    },
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { subject: string; description: string; category: string; priority: string }) => {
      const res = await apiClient.post('tickets', data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tickets'] });
    },
  });
}

export function useTicketDetails(id: string) {
  return useQuery({
    queryKey: ['ticket', id],
    queryFn: async () => {
      const res = await apiClient.get(`tickets/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useAddTicketComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, content, isInternal }: { id: string; content: string; isInternal?: boolean }) => {
      const res = await apiClient.post(`tickets/${id}/comments`, { content, isInternal });
      return res.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.id] });
    },
  });
}

// Admin Hooks
export function useAllTickets() {
  return useQuery({
    queryKey: ['all-tickets'],
    queryFn: async () => {
      const res = await apiClient.get('tickets/admin/all');
      return res.data.data;
    },
  });
}

export function useUpdateTicketStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiClient.put(`tickets/admin/${id}/status`, { status });
      return res.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['all-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.id] });
    },
  });
}

export function useAssignTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, assignedToId }: { id: string; assignedToId: string | null }) => {
      const res = await apiClient.put(`tickets/admin/${id}/assign`, { assignedToId });
      return res.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['all-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.id] });
    },
  });
}
