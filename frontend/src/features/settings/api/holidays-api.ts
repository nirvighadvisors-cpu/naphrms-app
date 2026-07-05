import apiClient from '@/lib/api-client';

export interface Holiday {
  id: string;
  name: string;
  date: string;
  type: string; // 'NATIONAL' | 'COMPANY'
  description: string | null;
  createdAt: string;
}

export type CreateHolidayInput = {
  name: string;
  date: string;
  type?: 'NATIONAL' | 'COMPANY';
  description?: string;
};

export type UpdateHolidayInput = Partial<CreateHolidayInput>;

export const holidaysApi = {
  getAll: (year?: number) => 
    apiClient.get<{ data: Holiday[] }>('/holidays', { params: { year } }).then(res => res.data.data),
    
  create: (data: CreateHolidayInput) => 
    apiClient.post<{ data: Holiday }>('/holidays', data).then(res => res.data.data),
    
  update: (id: string, data: UpdateHolidayInput) => 
    apiClient.patch<{ data: Holiday }>(`/holidays/${id}`, data).then(res => res.data.data),
    
  delete: (id: string) => 
    apiClient.delete(`/holidays/${id}`).then(res => res.data),
};
