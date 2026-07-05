import apiClient from '@/lib/api-client';

export interface DashboardStats {
  totalEmployees: number;
  activeLeavesToday: number;
  totalExpensesThisMonth: number;
  averagePerformanceRating: number;
}

export interface DepartmentDistribution {
  name: string;
  value: number;
}

export interface ExpenseTrend {
  month: string;
  amount: number;
}

export const reportsApi = {
  getDashboardStats: () => 
    apiClient.get<{ data: DashboardStats }>('/reports/dashboard-stats').then(res => res.data.data),
    
  getDepartmentDistribution: () => 
    apiClient.get<{ data: DepartmentDistribution[] }>('/reports/department-distribution').then(res => res.data.data),
    
  getExpenseTrends: () => 
    apiClient.get<{ data: ExpenseTrend[] }>('/reports/expense-trends').then(res => res.data.data),
};
