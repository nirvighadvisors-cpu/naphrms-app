import apiClient from '@/lib/api-client';

export interface Department {
  id: string;
  name: string;
  code: string | null;
  codeInitial: string;
  parentId: string | null;
  parent?: { id: string; name: string } | null;
  children?: { id: string; name: string; code: string | null; codeInitial: string }[];
  employeeCount: number;
  createdAt: string;
}

export type CreateDepartmentInput = {
  name: string;
  code: string;
  codeInitial: string;
  parentId?: string;
};

export type UpdateDepartmentInput = {
  name?: string;
};

export const departmentsApi = {
  getAll: () => 
    apiClient.get<{ data: Department[] }>('/departments').then(res => res.data.data),
    
  create: (data: CreateDepartmentInput) => 
    apiClient.post<{ data: Department }>('/departments', data).then(res => res.data.data),
    
  update: (id: string, data: UpdateDepartmentInput) => 
    apiClient.patch<{ data: Department }>(`/departments/${id}`, data).then(res => res.data.data),
    
  delete: (id: string) => 
    apiClient.delete(`/departments/${id}`).then(res => res.data),
};
