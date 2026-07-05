import { useQuery } from '@tanstack/react-query';
import { reportsApi } from './reports-api';

export const reportKeys = {
  all: ['reports'] as const,
  stats: () => [...reportKeys.all, 'stats'] as const,
  departments: () => [...reportKeys.all, 'departments'] as const,
  expenses: () => [...reportKeys.all, 'expenses'] as const,
};

export function useDashboardStats() {
  return useQuery({
    queryKey: reportKeys.stats(),
    queryFn: reportsApi.getDashboardStats,
  });
}

export function useDepartmentDistribution() {
  return useQuery({
    queryKey: reportKeys.departments(),
    queryFn: reportsApi.getDepartmentDistribution,
  });
}

export function useExpenseTrends() {
  return useQuery({
    queryKey: reportKeys.expenses(),
    queryFn: reportsApi.getExpenseTrends,
  });
}
