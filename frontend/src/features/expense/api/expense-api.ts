import apiClient from '@/lib/api-client';

// ── Types ─────────────────────────────────────────────────────

export type ExpenseCategory =
  | 'TRAVEL'
  | 'LOCAL_TRANSPORT'
  | 'ACCOMMODATION'
  | 'MEALS'
  | 'CLIENT_ENTERTAINMENT'
  | 'SITE_VISIT'
  | 'OFFICE_SUPPLIES'
  | 'OTHER';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type PaymentStatus = 'UNPAID' | 'APPROVED_FOR_PAYMENT' | 'PAID';

export interface ExpenseItem {
  id: string;
  claimId: string;
  description: string;
  amount: number;
  date: string;
  receiptUrl: string | null;
}

export interface ExpenseClaim {
  id: string;
  employeeId: string;
  title: string;
  category: ExpenseCategory;
  totalAmount: number;
  status: ApprovalStatus;
  approvedById: string | null;
  approvedAt: string | null;
  remarks: string | null;
  paymentStatus: PaymentStatus;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: ExpenseItem[];
  _count?: { items: number };
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    profilePhotoUrl?: string | null;
    department?: { name: string };
  };
}

export interface ExpenseSummary {
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
  pendingAmount: number;
  approvedAmount: number;
  paidAmount: number;
  categoryBreakdown: {
    category: ExpenseCategory;
    totalAmount: number;
    count: number;
  }[];
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

export interface CreateClaimInput {
  title: string;
  category: ExpenseCategory;
  items: {
    description: string;
    amount: number;
    date: string;
    receiptUrl?: string;
    receiptBase64?: string;
  }[];
}

// ── API Functions ─────────────────────────────────────────────

export const expenseApi = {
  // ─ Employee ────────────────────────────────────────────────
  createClaim: async (data: CreateClaimInput): Promise<ExpenseClaim> => {
    const res = await apiClient.post('expenses', data);
    return res.data.data;
  },

  getMyClaims: async (params: {
    status?: string;
    category?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<ExpenseClaim>> => {
    const res = await apiClient.get('expenses/my', { params });
    return res.data;
  },

  getClaimById: async (id: string): Promise<ExpenseClaim> => {
    const res = await apiClient.get(`expenses/${id}`);
    return res.data.data;
  },

  updateClaim: async (id: string, data: { title?: string; category?: ExpenseCategory }): Promise<ExpenseClaim> => {
    const res = await apiClient.patch(`expenses/${id}`, data);
    return res.data.data;
  },

  deleteClaim: async (id: string): Promise<void> => {
    await apiClient.delete(`expenses/${id}`);
  },

  addItem: async (claimId: string, data: { description: string; amount: number; date: string; receiptUrl?: string; receiptBase64?: string }): Promise<ExpenseItem> => {
    const res = await apiClient.post(`expenses/${claimId}/items`, data);
    return res.data.data;
  },

  deleteItem: async (claimId: string, itemId: string): Promise<void> => {
    await apiClient.delete(`expenses/${claimId}/items/${itemId}`);
  },

  cancelClaim: async (id: string): Promise<ExpenseClaim> => {
    const res = await apiClient.patch(`expenses/${id}/cancel`);
    return res.data.data;
  },

  // ─ Admin ───────────────────────────────────────────────────
  getAllClaims: async (params: {
    status?: string;
    category?: string;
    paymentStatus?: string;
    employeeId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<ExpenseClaim>> => {
    const res = await apiClient.get('expenses', { params });
    return res.data;
  },

  reviewClaim: async (id: string, data: { status: string; remarks?: string }): Promise<ExpenseClaim> => {
    const res = await apiClient.patch(`expenses/${id}/review`, data);
    return res.data.data;
  },

  updatePayment: async (id: string, data: { paymentStatus: string }): Promise<ExpenseClaim> => {
    const res = await apiClient.patch(`expenses/${id}/payment`, data);
    return res.data.data;
  },

  getExpenseSummary: async (): Promise<ExpenseSummary> => {
    const res = await apiClient.get('expenses/summary');
    return res.data.data;
  },
};
