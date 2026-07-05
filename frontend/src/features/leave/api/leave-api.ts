import apiClient from '@/lib/api-client';

// ── Types ─────────────────────────────────────────────────────
export interface LeaveType {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isPaid: boolean;
  maxDaysPerYear: number;
  carryForward: boolean;
  maxCarryForward: number | null;
  requiresDoc: boolean;
  noticeDays: number;
  createdAt: string;
}

export interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  leaveType: LeaveType;
  year: number;
  totalDays: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    department?: { name: string };
  };
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  attachment: string | null;
  childNumber?: number | null;
  expectedDeliveryDate?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  approvedById: string | null;
  approvedAt: string | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    profilePhotoUrl?: string;
    department?: { name: string };
  };
  leaveType?: LeaveType;
}

export interface LeaveSummary {
  pendingCount: number;
  approvedThisMonth: number;
  rejectedThisMonth: number;
  topLeaveType: string | null;
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

// ── API Functions ─────────────────────────────────────────────
export const leaveApi = {
  // ─ Leave Types ─────────────────────────────────────────────
  getLeaveTypes: async (): Promise<LeaveType[]> => {
    const res = await apiClient.get('leave/types');
    return res.data.data;
  },

  createLeaveType: async (data: Partial<LeaveType>): Promise<LeaveType> => {
    const res = await apiClient.post('leave/types', data);
    return res.data.data;
  },

  updateLeaveType: async (id: string, data: Partial<LeaveType>): Promise<LeaveType> => {
    const res = await apiClient.patch(`leave/types/${id}`, data);
    return res.data.data;
  },

  deleteLeaveType: async (id: string): Promise<void> => {
    await apiClient.delete(`leave/types/${id}`);
  },

  // ─ Balances ────────────────────────────────────────────────
  getMyBalances: async (): Promise<LeaveBalance[]> => {
    const res = await apiClient.get('leave/balances/my');
    return res.data.data;
  },

  getAllBalances: async (params: { employeeId?: string; year?: number }): Promise<PaginatedResponse<LeaveBalance>> => {
    const res = await apiClient.get('leave/balances', { params });
    return res.data;
  },

  initializeBalances: async (data: { year: number; employeeIds?: string[] }): Promise<void> => {
    const res = await apiClient.post('leave/balances/initialize', data);
    return res.data.data;
  },

  // ─ Requests ────────────────────────────────────────────────
  applyLeave: async (data: { leaveTypeId: string; startDate: string; endDate: string; reason: string; attachment?: string; childNumber?: number; expectedDeliveryDate?: string }): Promise<LeaveRequest> => {
    const res = await apiClient.post('leave/apply', data);
    return res.data.data;
  },

  getMyLeaves: async (params: { status?: string; page?: number; limit?: number }): Promise<PaginatedResponse<LeaveRequest>> => {
    const res = await apiClient.get('leave/my', { params });
    return res.data;
  },

  getAllLeaveRequests: async (params: {
    status?: string;
    employeeId?: string;
    leaveTypeId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<LeaveRequest>> => {
    const res = await apiClient.get('leave/requests', { params });
    return res.data;
  },

  reviewLeave: async (id: string, data: { status: string; remarks?: string }): Promise<LeaveRequest> => {
    const res = await apiClient.patch(`leave/requests/${id}/review`, data);
    return res.data.data;
  },

  cancelLeave: async (id: string): Promise<LeaveRequest> => {
    const res = await apiClient.patch(`leave/requests/${id}/cancel`);
    return res.data.data;
  },

  getLeaveSummary: async (): Promise<LeaveSummary> => {
    const res = await apiClient.get('leave/summary');
    return res.data.data;
  },

  uploadAttachment: async (file: File): Promise<{ fileUrl: string; signedUrl: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('leave/upload-attachment', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data.data;
  },
};
