import apiClient from '@/lib/api-client';

export interface Department {
  id: string;
  name: string;
  code: string;
  codeInitial: string;
  parentId: string | null;
  parent?: { id: string; name: string } | null;
  children?: Department[];
  employeeCount: number;
  createdAt: string;
}

export const departmentApi = {
  list: async (): Promise<Department[]> => {
    const { data } = await apiClient.get('departments');
    return data.data;
  },

  create: async (input: { name: string; code: string; codeInitial: string; parentId?: string }): Promise<Department> => {
    const { data } = await apiClient.post('departments', input);
    return data.data;
  },
};
