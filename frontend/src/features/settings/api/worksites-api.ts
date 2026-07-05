import apiClient from '@/lib/api-client';

export interface WorkSite {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  radius: number | null;
  createdAt: string;
  _count?: { employees: number };
}

export type CreateWorkSiteInput = {
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
};

export type UpdateWorkSiteInput = Partial<CreateWorkSiteInput>;

export const worksitesApi = {
  getAll: () => 
    apiClient.get<{ data: WorkSite[] }>('/worksites').then(res => res.data.data),
    
  create: (data: CreateWorkSiteInput) => 
    apiClient.post<{ data: WorkSite }>('/worksites', data).then(res => res.data.data),
    
  update: (id: string, data: UpdateWorkSiteInput) => 
    apiClient.patch<{ data: WorkSite }>(`/worksites/${id}`, data).then(res => res.data.data),
    
  delete: (id: string) => 
    apiClient.delete(`/worksites/${id}`).then(res => res.data),
};
