import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollApi } from './payroll-api';
import type { PayrollRunListParams } from './payroll-api';
import { useToast } from '@/hooks/use-toast';

// ── Queries ───────────────────────────────────────────────────

export const useStructures = () => {
  return useQuery({
    queryKey: ['payroll', 'structures'],
    queryFn: () => payrollApi.getStructures(),
  });
};

export const useStructure = (id: string) => {
  return useQuery({
    queryKey: ['payroll', 'structures', id],
    queryFn: () => payrollApi.getStructure(id),
    enabled: !!id,
  });
};

export const usePayrollRuns = (params: PayrollRunListParams = {}) => {
  return useQuery({
    queryKey: ['payroll', 'runs', params],
    queryFn: () => payrollApi.getPayrollRuns(params),
  });
};

export const usePayrollRun = (id: string) => {
  return useQuery({
    queryKey: ['payroll', 'runs', id],
    queryFn: () => payrollApi.getPayrollRun(id),
    enabled: !!id,
  });
};

export const useMyPayslips = () => {
  return useQuery({
    queryKey: ['payroll', 'payslips', 'my'],
    queryFn: () => payrollApi.getMyPayslips(),
  });
};

export const usePayslip = (id: string) => {
  return useQuery({
    queryKey: ['payroll', 'payslips', id],
    queryFn: () => payrollApi.getPayslip(id),
    enabled: !!id,
  });
};

// ── Mutations ─────────────────────────────────────────────────

export const useCreateStructure = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: { name: string }) => payrollApi.createStructure(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll', 'structures'] });
      toast({ title: 'Structure created', description: 'Salary structure has been created successfully.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create structure',
        description: error?.response?.data?.error?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteStructure = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => payrollApi.deleteStructure(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll', 'structures'] });
      toast({ title: 'Structure deleted', description: 'Salary structure has been removed.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete structure',
        description: error?.response?.data?.error?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
};

export const useAddComponent = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      structureId,
      data,
    }: {
      structureId: string;
      data: { name: string; code?: string; type: string; category?: string; calculationType: string; value: number; formula?: string; order: number };
    }) => payrollApi.addComponent(structureId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll', 'structures'] });
      toast({ title: 'Component added', description: 'Salary component has been added to the structure.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to add component',
        description: error?.response?.data?.error?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateComponent = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      structureId,
      componentId,
      data,
    }: {
      structureId: string;
      componentId: string;
      data: Partial<{ name: string; code: string; type: string; category: string; calculationType: string; value: number; formula: string; order: number }>;
    }) => payrollApi.updateComponent(structureId, componentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll', 'structures'] });
      toast({ title: 'Component updated', description: 'Salary component has been updated.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update component',
        description: error?.response?.data?.error?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteComponent = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ structureId, componentId }: { structureId: string; componentId: string }) =>
      payrollApi.deleteComponent(structureId, componentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll', 'structures'] });
      toast({ title: 'Component deleted', description: 'Salary component has been removed.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete component',
        description: error?.response?.data?.error?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
};

export const useAssignStructure = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: { employeeId?: string; employeeIds?: string[]; structureId: string; basicSalary: number }) => payrollApi.assignStructure(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll', 'structures'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: 'Structure assigned', description: 'Salary structure has been assigned to the employee.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to assign structure',
        description: error?.response?.data?.error?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
};

export const useGeneratePayroll = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: { month: number; year: number }) => payrollApi.generatePayroll(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll', 'runs'] });
      toast({ title: 'Payroll generated', description: 'Payroll run has been generated successfully.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to generate payroll',
        description: error?.response?.data?.error?.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
};

export const useLockPayroll = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => payrollApi.lockPayroll(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['payroll', 'runs'] });
      queryClient.invalidateQueries({ queryKey: ['payroll', 'runs', id] });
      toast({ title: 'Payroll Locked', description: 'Payroll run has been locked permanently.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to lock payroll',
        description: error.response?.data?.error?.message || 'An error occurred.',
        variant: 'destructive',
      });
    },
  });
};

export const useDeletePayrollRun = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => payrollApi.deletePayrollRun(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll', 'runs'] });
      toast({ title: 'Payroll Run Deleted', description: 'The payroll run has been deleted successfully.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete payroll run',
        description: error.response?.data?.error?.message || 'An error occurred.',
        variant: 'destructive',
      });
    },
  });
};

export const usePreviewSalary = () => {
  return useMutation({
    mutationFn: ({ id, basicSalary }: { id: string; basicSalary: number }) =>
      payrollApi.previewSalary(id, { basicSalary }),
  });
};

export const useStatutoryRules = () => {
  return useQuery({
    queryKey: ['payroll', 'statutory-rules'],
    queryFn: () => payrollApi.getStatutoryRules(),
  });
};

export const useUpdateStatutoryRule = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<import('./payroll-api').StatutoryRule> }) =>
      payrollApi.updateStatutoryRule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll', 'statutory-rules'] });
      toast({ title: 'Statutory Rule Updated', description: 'The rule has been updated successfully.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Update failed',
        description: error.response?.data?.error?.message || 'Failed to update statutory rule.',
        variant: 'destructive',
      });
    },
  });
};

export const useStructureVersions = (structureId: string | null) => {
  return useQuery({
    queryKey: ['payroll', 'structures', structureId, 'versions'],
    queryFn: () => payrollApi.getStructureVersions(structureId!),
    enabled: !!structureId,
  });
};

export const useAuditLogs = () => {
  return useQuery({
    queryKey: ['payroll', 'audit-logs'],
    queryFn: () => payrollApi.getAuditLogs(),
  });
};
