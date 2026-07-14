import apiClient from '@/lib/api-client';

// ── Types ─────────────────────────────────────────────────────
export interface SalaryComponent {
  id: string;
  structureId: string;
  name: string;
  code?: string | null;
  type: 'EARNING' | 'DEDUCTION';
  category: 'EARNING' | 'DEDUCTION' | 'REIMBURSEMENT' | 'BONUS' | 'STATUTORY_EMPLOYEE' | 'STATUTORY_EMPLOYER';
  calculationType: 'FIXED' | 'PERCENTAGE_OF_BASIC' | 'PERCENTAGE_OF_GROSS' | 'PERCENTAGE_OF_CTC' | 'FORMULA' | 'SLAB_BASED';
  value: number;
  formula?: string | null;
  dependsOn?: string[];
  isStatutory?: boolean;
  isTaxable?: boolean;
  minValue?: number | null;
  maxValue?: number | null;
  slabConfig?: any;
  order: number;
}

export interface StatutoryRule {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  ruleType: 'PERCENTAGE' | 'SLAB';
  baseComponent?: string | null;
  employerRate: number;
  employeeRate: number;
  wageCap?: number | null;
  slabConfig?: any;
  isActive: boolean;
  state?: string | null;
  createdAt: string;
}

export interface StructureVersion {
  id: string;
  structureId: string;
  versionNumber: number;
  componentsSnapshot: any;
  createdBy: string;
  createdAt: string;
}

export interface PayrollAuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  changes?: any;
  performedById: string;
  performedAt: string;
}

export interface SalaryStructure {
  id: string;
  name: string;
  components: SalaryComponent[];
  employees?: any[];
  _count?: { employees: number };
  createdAt: string;
}

export interface PayrollRun {
  id: string;
  month: number;
  year: number;
  status: 'DRAFT' | 'PROCESSING' | 'COMPLETED' | 'LOCKED';
  generatedById: string;
  processedAt: string | null;
  lockedAt: string | null;
  payslips?: Payslip[];
  _count?: { payslips: number };
  createdAt: string;
}

export interface Payslip {
  id: string;
  employeeId: string;
  payrollRunId: string;
  month: number;
  year: number;
  basicSalary: number;
  earnings: Record<string, number>;
  deductions: Record<string, number>;
  grossEarnings: number;
  totalDeductions: number;
  netPayable: number;
  taxRegime?: string | null;
  taxableIncome: number;
  taxBreakdown?: any;
  workingDays: number;
  presentDays: number;
  pdfUrl: string | null;
  generatedAt: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    designation: string;
    department?: { name: string };
    panNumber?: string | null;
    uanNumber?: string | null;
    pfAccountNumber?: string | null;
  };
  lineItems?: PayslipLineItemType[];
}

export interface PayslipLineItemType {
  id: string;
  name: string;
  code?: string | null;
  category: string;
  type: string;
  calculationType: string;
  rawValue: number;
  baseAmount: number;
  calculatedAmount: number;
  formula?: string | null;
  order: number;
}

export interface CalculatedLineItem {
  name: string;
  code?: string | null;
  category: 'EARNING' | 'DEDUCTION' | 'REIMBURSEMENT' | 'BONUS' | 'STATUTORY_EMPLOYEE' | 'STATUTORY_EMPLOYER';
  type: 'EARNING' | 'DEDUCTION';
  calculationType: 'FIXED' | 'PERCENTAGE_OF_BASIC' | 'PERCENTAGE_OF_GROSS' | 'PERCENTAGE_OF_CTC' | 'FORMULA' | 'SLAB_BASED';
  rawValue: number;
  baseAmount: number;
  calculatedAmount: number;
  formula: string;
  order: number;
}

export interface SalaryBreakdown {
  basicSalary: number;
  earnings: CalculatedLineItem[];
  deductions: CalculatedLineItem[];
  grossEarnings: number;
  totalDeductions: number;
  netPayable: number;
}

export interface PayrollRunListParams {
  status?: string;
  month?: number;
  year?: number;
  page?: number;
  limit?: number;
}

export interface PaginatedPayrollResponse {
  data: PayrollRun[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ── API Functions ─────────────────────────────────────────────
export const payrollApi = {
  // ─ Salary Structures ────────────────────────────────────────
  getStructures: async (): Promise<SalaryStructure[]> => {
    const res = await apiClient.get('payroll/structures');
    return res.data.data;
  },

  getStructure: async (id: string): Promise<SalaryStructure> => {
    const res = await apiClient.get(`payroll/structures/${id}`);
    return res.data.data;
  },

  createStructure: async (data: { name: string }): Promise<SalaryStructure> => {
    const res = await apiClient.post('payroll/structures', data);
    return res.data.data;
  },

  deleteStructure: async (id: string): Promise<void> => {
    await apiClient.delete(`payroll/structures/${id}`);
  },

  // ─ Salary Components ───────────────────────────────────────
  addComponent: async (
    structureId: string,
    data: { name: string; code?: string; type: string; category?: string; calculationType: string; value: number; formula?: string; order: number }
  ): Promise<SalaryComponent> => {
    const res = await apiClient.post(`payroll/structures/${structureId}/components`, data);
    return res.data.data;
  },

  updateComponent: async (
    structureId: string,
    componentId: string,
    data: Partial<{ name: string; code: string; type: string; category: string; calculationType: string; value: number; formula: string; order: number }>
  ): Promise<SalaryComponent> => {
    const res = await apiClient.patch(`payroll/structures/${structureId}/components/${componentId}`, data);
    return res.data.data;
  },

  deleteComponent: async (structureId: string, componentId: string): Promise<void> => {
    await apiClient.delete(`payroll/structures/${structureId}/components/${componentId}`);
  },

  // ─ Assign Structure ────────────────────────────────────────
  assignStructure: async (data: { employeeId?: string; employeeIds?: string[]; structureId: string; basicSalary?: number; assignments?: { employeeId: string; basicSalary: number }[] }): Promise<void> => {
    await apiClient.post('payroll/assign', data);
  },

  // ─ Duplicate Structure ─────────────────────────────────────
  duplicateStructure: async (id: string, data: { name: string }): Promise<SalaryStructure> => {
    const res = await apiClient.post(`payroll/structures/${id}/duplicate`, data);
    return res.data.data;
  },

  // ─ Payroll Runs ────────────────────────────────────────────
  getPayrollRuns: async (params: PayrollRunListParams = {}): Promise<PaginatedPayrollResponse> => {
    const res = await apiClient.get('payroll/runs', { params });
    return res.data;
  },

  getPayrollRun: async (id: string): Promise<PayrollRun> => {
    const res = await apiClient.get(`payroll/runs/${id}`);
    return res.data.data;
  },

  generatePayroll: async (data: { month: number; year: number }): Promise<PayrollRun> => {
    const res = await apiClient.post('payroll/runs/generate', data);
    return res.data.data;
  },

  lockPayroll: async (id: string): Promise<PayrollRun> => {
    const res = await apiClient.patch(`payroll/runs/${id}/lock`);
    return res.data.data;
  },

  deletePayrollRun: async (id: string): Promise<void> => {
    await apiClient.delete(`payroll/runs/${id}`);
  },

  // ─ Employee Payslips ───────────────────────────────────────
  getMyPayslips: async (): Promise<Payslip[]> => {
    const res = await apiClient.get('payroll/payslips/my');
    return res.data.data;
  },

  getPayslip: async (id: string): Promise<Payslip> => {
    const res = await apiClient.get(`payroll/payslips/${id}`);
    return res.data.data;
  },

  // ─ Preview Salary ──────────────────────────────────────────
  previewSalary: async (id: string, data: { basicSalary: number }): Promise<any> => {
    const response = await apiClient.post(`payroll/structures/${id}/preview`, data);
    return response.data.data;
  },

  // ─ Statutory Rules ─────────────────────────────────────────
  getStatutoryRules: async (): Promise<StatutoryRule[]> => {
    const res = await apiClient.get('payroll/statutory-rules');
    return res.data.data;
  },

  updateStatutoryRule: async (
    id: string,
    data: Partial<Omit<StatutoryRule, 'id' | 'code' | 'name' | 'createdAt' | 'updatedAt'>>
  ): Promise<StatutoryRule> => {
    const res = await apiClient.patch(`payroll/statutory-rules/${id}`, data);
    return res.data.data;
  },

  // ─ Audit & Versioning ──────────────────────────────────────
  getStructureVersions: async (id: string): Promise<StructureVersion[]> => {
    const res = await apiClient.get(`payroll/structures/${id}/versions`);
    return res.data.data;
  },

  getStructureVersion: async (id: string, versionId: string): Promise<StructureVersion> => {
    const res = await apiClient.get(`payroll/structures/${id}/versions/${versionId}`);
    return res.data.data;
  },

  getAuditLogs: async (): Promise<PayrollAuditLog[]> => {
    const res = await apiClient.get('payroll/audit-logs');
    return res.data.data;
  },
};
