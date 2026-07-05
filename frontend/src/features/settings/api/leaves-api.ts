import apiClient from '@/lib/api-client';

export interface LeaveType {
  id: string;
  name: string;
  code: string;
  description?: string;
  isPaid: boolean;
  maxDaysPerYear: number;
  carryForward: boolean;
  maxCarryForward?: number;
  requiresDoc: boolean;
  noticeDays: number;
}

export const leaveTypesApi = {
  getAll: async () => {
    const { data } = await apiClient.get('/leave/types');
    return data.data as LeaveType[];
  },
  create: async (payload: Partial<LeaveType>) => {
    const { data } = await apiClient.post('/leave/types', payload);
    return data.data as LeaveType;
  },
  update: async (id: string, payload: Partial<LeaveType>) => {
    const { data } = await apiClient.patch(`/leave/types/${id}`, payload);
    return data.data as LeaveType;
  },
  delete: async (id: string) => {
    const { data } = await apiClient.delete(`/leave/types/${id}`);
    return data;
  },
};
