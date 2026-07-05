import apiClient from '@/lib/api-client';

export interface DailyLog {
  id: string;
  employeeId: string;
  date: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    profilePhotoUrl: string | null;
    department?: { name: string } | null;
  };
}

export const timesheetApi = {
  submitLog: (data: { date: string; content: string }) => 
    apiClient.post<{ data: DailyLog }>('/timesheets', data).then(res => res.data.data),
    
  getMyLogs: () => 
    apiClient.get<{ data: DailyLog[] }>('/timesheets/my').then(res => res.data.data),
    
  getAllLogs: (params?: { date?: string; employeeId?: string }) => 
    apiClient.get<{ data: DailyLog[] }>('/timesheets/all', { params }).then(res => res.data.data),
};
