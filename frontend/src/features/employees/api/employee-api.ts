import apiClient from '@/lib/api-client';

// ── Types ─────────────────────────────────────────────────────
export interface Employee {
  id: string;
  employeeCode: string | null;
  firstName: string;
  lastName: string;
  gender?: string;
  dateOfBirth?: string;
  profilePhotoUrl?: string;
  personalEmail?: string;
  phone?: string;
  alternatePhone?: string;
  currentAddress?: string;
  permanentAddress?: string;
  emergencyContactName?: string;
  emergencyContactRel?: string;
  emergencyContactPhone?: string;
  dateOfJoining: string;
  dateOfLeaving?: string;
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACTOR' | 'INTERN';
  designation: string;
  departmentId: string;
  department?: { id: string; name: string; code: string };
  workSiteId?: string;
  managerId?: string;
  manager?: { id: string; firstName: string; lastName: string; employeeCode: string };
  status: 'ACTIVE' | 'INACTIVE' | 'TERMINATED' | 'ON_LEAVE' | 'PENDING_REGISTRATION';
  user?: { id: string; email: string; status: string; role: string };
  isEsicCovered?: boolean;
  esicNumber?: string;
  taxRegime?: string;
  panNumber?: string;
  uanNumber?: string;
  pfAccountNumber?: string;
  weekOffDays: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeListParams {
  page?: number;
  limit?: number;
  search?: string;
  departmentId?: string;
  status?: string;
  employmentType?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface EmployeeStats {
  totalEmployees: number;
  activeRate: number;
  newHiresThisMonth: number;
  totalDepartments: number;
  departmentBreakdown: Array<{ department: string; count: number }>;
  employmentTypeBreakdown: Array<{ type: string; count: number }>;
  recentJoiners: Array<Employee>;
}

export interface CreateEmployeeInput {
  firstName: string;
  lastName: string;
  email: string;
  dateOfJoining: string;
  designation: string;
  departmentId: string;
  gender?: string;
  dateOfBirth?: string;
  personalEmail?: string;
  phone?: string;
  alternatePhone?: string;
  currentAddress?: string;
  permanentAddress?: string;
  emergencyContactName?: string;
  emergencyContactRel?: string;
  emergencyContactPhone?: string;
  employmentType?: string;
  managerId?: string | null;
  workSiteId?: string | null;
  isEsicCovered?: boolean;
  esicNumber?: string;
  taxRegime?: string;
  panNumber?: string;
  uanNumber?: string;
  pfAccountNumber?: string;
  weekOffDays?: string[];
}

export type UpdateEmployeeInput = Partial<Omit<CreateEmployeeInput, 'email'>>;

export interface UpdateMeInput {
  personalEmail?: string;
  phone?: string;
  alternatePhone?: string;
  currentAddress?: string;
  permanentAddress?: string;
  emergencyContactName?: string;
  emergencyContactRel?: string;
  emergencyContactPhone?: string;
}

// ── API Functions ─────────────────────────────────────────────
export const employeeApi = {
  list: async (params: EmployeeListParams = {}): Promise<PaginatedResponse<Employee>> => {
    const { data } = await apiClient.get('employees', { params });
    return data;
  },

  getStats: async (): Promise<EmployeeStats> => {
    const { data } = await apiClient.get('employees/stats');
    return data;
  },

  getById: async (id: string): Promise<Employee> => {
    const { data } = await apiClient.get(`employees/${id}`);
    return data.data;
  },

  getMe: async (): Promise<Employee> => {
    const response = await apiClient.get('/employees/me');
    return response.data.data;
  },

  getDirectory: async (params?: EmployeeListParams): Promise<PaginatedResponse<Employee>> => {
    const response = await apiClient.get('/employees/directory', { params });
    return response.data;
  },

  getDirectoryById: async (id: string): Promise<Employee> => {
    const response = await apiClient.get(`/employees/directory/${id}`);
    return response.data.data;
  },

  updateMe: async (input: UpdateMeInput): Promise<Employee> => {
    const { data } = await apiClient.patch('employees/me', input);
    return data.data;
  },

  create: async (input: CreateEmployeeInput): Promise<Employee> => {
    const { data } = await apiClient.post('employees', input);
    return data.data;
  },

  update: async (id: string, input: UpdateEmployeeInput): Promise<Employee> => {
    const { data } = await apiClient.patch(`employees/${id}`, input);
    return data.data;
  },

  updateStatus: async (id: string, status: string, reason?: string): Promise<Employee> => {
    const { data } = await apiClient.patch(`employees/${id}/status`, { status, reason });
    return data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`employees/${id}`);
  },

  getStatusHistory: async (id: string): Promise<StatusHistoryResponse> => {
    const { data } = await apiClient.get(`employees/${id}/history`);
    return data.data;
  },
};

export interface StatusHistoryEntry {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  reason: string | null;
  changedBy: string;
  createdAt: string;
}

export interface StatusHistoryResponse {
  employee: {
    id: string;
    name: string;
    dateOfJoining: string;
  };
  history: StatusHistoryEntry[];
}
