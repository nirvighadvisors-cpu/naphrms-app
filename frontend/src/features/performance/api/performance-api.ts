import apiClient from '@/lib/api-client';

// ── Types ─────────────────────────────────────────────────────

export type CycleStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
export type GoalStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type ReviewStatus = 'SELF_REVIEW_PENDING' | 'SELF_SUBMITTED' | 'HR_REVIEW_PENDING' | 'COMPLETED';

export interface ReviewCycle {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: CycleStatus;
  createdAt: string;
  _count?: { reviews: number; goals: number };
}

export interface Goal {
  id: string;
  employeeId: string;
  cycleId: string;
  title: string;
  description: string | null;
  targetDate: string | null;
  status: GoalStatus;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  employeeId: string;
  cycleId: string;
  selfRating: number | null;
  selfComments: string | null;
  hrRating: number | null;
  hrComments: string | null;
  finalRating: number | null;
  status: ReviewStatus;
  submittedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    department?: { name: string };
    profilePhotoUrl?: string | null;
  };
  cycle?: ReviewCycle;
}

export interface PerformanceSummary {
  activeCycle: ReviewCycle | null;
  totalCycles: number;
  activeCycleStats: {
    totalReviews: number;
    pendingHrReviews: number;
    completedReviews: number;
    averageRating: number;
    completionRate: number;
  };
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

// ── API Client ────────────────────────────────────────────────

export const performanceApi = {
  // ─ Cycles ───────────────────────────────────────────────────
  createCycle: async (data: { name: string; startDate: string; endDate: string }): Promise<ReviewCycle> => {
    const res = await apiClient.post('performance/cycles', data);
    return res.data.data;
  },

  getCycles: async (params?: { status?: CycleStatus }): Promise<ReviewCycle[]> => {
    const res = await apiClient.get('performance/cycles', { params });
    return res.data.data;
  },

  getActiveCycle: async (): Promise<ReviewCycle> => {
    const res = await apiClient.get('performance/cycles/active');
    return res.data.data;
  },

  updateCycleStatus: async (id: string, status: CycleStatus): Promise<ReviewCycle> => {
    const res = await apiClient.patch(`performance/cycles/${id}/status`, { status });
    return res.data.data;
  },

  // ─ Goals ────────────────────────────────────────────────────
  createGoal: async (data: { cycleId: string; title: string; description?: string; targetDate?: string }): Promise<Goal> => {
    const res = await apiClient.post('performance/goals', data);
    return res.data.data;
  },

  getMyGoals: async (cycleId?: string): Promise<Goal[]> => {
    const res = await apiClient.get('performance/goals/my', { params: { cycleId } });
    return res.data.data;
  },

  updateGoalProgress: async (id: string, data: { progress: number; status: GoalStatus }): Promise<Goal> => {
    const res = await apiClient.patch(`performance/goals/${id}/progress`, data);
    return res.data.data;
  },

  // ─ Reviews ──────────────────────────────────────────────────
  getMyReview: async (cycleId: string): Promise<Review> => {
    const res = await apiClient.get(`performance/reviews/my/${cycleId}`);
    return res.data.data;
  },

  submitSelfReview: async (cycleId: string, data: { selfRating: number; selfComments: string }): Promise<Review> => {
    const res = await apiClient.patch(`performance/reviews/my/${cycleId}`, data);
    return res.data.data;
  },

  getAllReviews: async (params: { cycleId?: string; status?: ReviewStatus; employeeId?: string; page?: number; limit?: number }): Promise<PaginatedResponse<Review>> => {
    const res = await apiClient.get('performance/reviews', { params });
    return res.data;
  },

  submitHrReview: async (id: string, data: { hrRating: number; hrComments: string; finalRating: number }): Promise<Review> => {
    const res = await apiClient.patch(`performance/reviews/${id}/hr`, data);
    return res.data.data;
  },

  // ─ Summary ──────────────────────────────────────────────────
  getPerformanceSummary: async (): Promise<PerformanceSummary> => {
    const res = await apiClient.get('performance/summary');
    return res.data.data;
  },
};
