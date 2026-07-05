import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeApi } from './employee-api';
import type { EmployeeListParams, CreateEmployeeInput, UpdateEmployeeInput } from './employee-api';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export const useEmployees = (params: EmployeeListParams = {}) => {
  return useQuery({
    queryKey: ['employees', params],
    queryFn: () => employeeApi.list(params),
  });
};

export const useEmployeeDirectory = (params: EmployeeListParams = { limit: 1000 }) => {
  return useQuery({
    queryKey: ['employees', 'directory', params],
    queryFn: () => employeeApi.getDirectory(params),
  });
};

export const useEmployeeDirectoryById = (id: string) => {
  return useQuery({
    queryKey: ['employees', 'directory', id],
    queryFn: () => employeeApi.getDirectoryById(id),
    enabled: !!id,
  });
};

export const useEmployee = (id: string) => {
  return useQuery({
    queryKey: ['employees', id],
    queryFn: () => employeeApi.getById(id),
    enabled: !!id,
  });
};

export const useMe = () => {
  return useQuery({
    queryKey: ['employees', 'me'],
    queryFn: () => employeeApi.getMe(),
  });
};

export const useUpdateMe = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: Parameters<typeof employeeApi.updateMe>[0]) => employeeApi.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', 'me'] });
      toast({ title: 'Profile updated', description: 'Your profile has been updated successfully.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Update failed',
        description: error?.response?.data?.error?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
};

export const useEmployeeStats = () => {
  return useQuery({
    queryKey: ['employees', 'stats'],
    queryFn: () => employeeApi.getStats(),
    staleTime: 0,
  });
};

export const useCreateEmployee = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: CreateEmployeeInput) => employeeApi.create(data),
    onSuccess: (employee) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: 'Employee created',
        description: `${employee.firstName} ${employee.lastName} (${employee.employeeCode}) has been added.`,
      });
      navigate('/admin/employees');
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create employee',
        description: error?.response?.data?.error?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEmployeeInput }) => employeeApi.update(id, data),
    onSuccess: (employee) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employees', employee.id] });
      toast({ title: 'Employee updated', description: 'Changes saved successfully.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Update failed',
        description: error?.response?.data?.error?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateEmployeeStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
      employeeApi.updateStatus(id, status, reason),
    onSuccess: (employee) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employees', employee.id] });
      toast({ title: 'Status updated', description: `Employee is now ${employee.status}.` });
    },
    onError: (error: any) => {
      toast({
        title: 'Status update failed',
        description: error?.response?.data?.error?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (id: string) => employeeApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: 'Employee deleted', description: 'Employee has been permanently deleted.' });
      navigate('/admin/employees');
    },
    onError: (error: any) => {
      toast({
        title: 'Delete failed',
        description: error?.response?.data?.error?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
};

export const useEmployeeStatusHistory = (id: string) => {
  return useQuery({
    queryKey: ['employees', id, 'status-history'],
    queryFn: () => employeeApi.getStatusHistory(id),
    enabled: !!id,
  });
};
