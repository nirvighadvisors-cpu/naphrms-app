import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseApi, type ExpenseCategory, type CreateClaimInput } from './expense-api';
import { useToast } from '@/hooks/use-toast';

// ── Queries ───────────────────────────────────────────────────

export const useMyClaims = (params: { status?: string; category?: string; page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ['expenses', 'my', params],
    queryFn: () => expenseApi.getMyClaims(params),
  });
};

export const useAllClaims = (params: {
  status?: string;
  category?: string;
  paymentStatus?: string;
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ['expenses', 'all', params],
    queryFn: () => expenseApi.getAllClaims(params),
  });
};

export const useClaimDetail = (id: string) => {
  return useQuery({
    queryKey: ['expenses', 'detail', id],
    queryFn: () => expenseApi.getClaimById(id),
    enabled: !!id,
  });
};

export const useExpenseSummary = () => {
  return useQuery({
    queryKey: ['expenses', 'summary'],
    queryFn: () => expenseApi.getExpenseSummary(),
  });
};

// ── Mutations ─────────────────────────────────────────────────

export const useCreateClaim = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateClaimInput) => expenseApi.createClaim(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', 'my'] });
      toast({ title: 'Expense claim created', description: 'Your claim has been submitted successfully.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create claim',
        description: error?.response?.data?.error?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateClaim = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { title?: string; category?: ExpenseCategory } }) =>
      expenseApi.updateClaim(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', 'my'] });
      queryClient.invalidateQueries({ queryKey: ['expenses', 'detail', variables.id] });
      toast({ title: 'Claim updated', description: 'Your expense claim has been updated.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update claim',
        description: error?.response?.data?.error?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteClaim = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => expenseApi.deleteClaim(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', 'my'] });
      toast({ title: 'Claim deleted', description: 'Your expense claim has been deleted.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete claim',
        description: error?.response?.data?.error?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
};

export const useAddItem = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ claimId, data }: { claimId: string; data: { description: string; amount: number; date: string; receiptUrl?: string } }) =>
      expenseApi.addItem(claimId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', 'my'] });
      queryClient.invalidateQueries({ queryKey: ['expenses', 'detail', variables.claimId] });
      toast({ title: 'Item added', description: 'Expense item added to your claim.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to add item',
        description: error?.response?.data?.error?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteItem = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ claimId, itemId }: { claimId: string; itemId: string }) => expenseApi.deleteItem(claimId, itemId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', 'my'] });
      queryClient.invalidateQueries({ queryKey: ['expenses', 'detail', variables.claimId] });
      toast({ title: 'Item deleted', description: 'Expense item removed from your claim.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete item',
        description: error?.response?.data?.error?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
};

export const useCancelClaim = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => expenseApi.cancelClaim(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', 'my'] });
      queryClient.invalidateQueries({ queryKey: ['expenses', 'detail', variables.id] });
      toast({ title: 'Claim cancelled', description: 'Your expense claim has been cancelled.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to cancel claim',
        description: error?.response?.data?.error?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
};

export const useReviewClaim = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status: string; remarks?: string } }) =>
      expenseApi.reviewClaim(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['expenses', 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['expenses', 'detail', variables.id] });
      toast({ title: 'Claim reviewed', description: 'Expense claim status updated successfully.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to review claim',
        description: error?.response?.data?.error?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdatePayment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { paymentStatus: string } }) =>
      expenseApi.updatePayment(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['expenses', 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['expenses', 'detail', variables.id] });
      toast({ title: 'Payment status updated', description: 'Expense payment status updated successfully.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update payment status',
        description: error?.response?.data?.error?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
};
