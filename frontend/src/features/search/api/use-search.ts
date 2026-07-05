import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface SearchResults {
  employees: Array<{ id: string; firstName: string; lastName: string; employeeCode: string; designation: string; profilePhotoUrl: string | null }>;
  departments: Array<{ id: string; name: string; code: string }>;
  designations: Array<{ name: string }>;
  documents: Array<{ id: string; fileName: string; type: string; employeeId: string; employee?: { firstName: string; lastName: string } }>;
  policies: Array<{ id: string; title: string; version: string }>;
  leaveRequests: Array<{ id: string; reason: string; leaveType: { name: string }; employee?: { firstName: string; lastName: string } }>;
  attendance: Array<{ id: string; date: string; status: string; employee?: { firstName: string; lastName: string } }>;
  payroll: Array<{ id: string; month: number; year: number; netPayable: number; employee?: { firstName: string; lastName: string } }>;
}

export const useGlobalSearch = (query: string) => {
  return useQuery<SearchResults>({
    queryKey: ['globalSearch', query],
    queryFn: async () => {
      if (!query || query.length < 2) {
        return {
          employees: [],
          departments: [],
          designations: [],
          documents: [],
          policies: [],
          leaveRequests: [],
          attendance: [],
          payroll: [],
        };
      }
      const { data } = await apiClient.get('/search', { params: { q: query } });
      return data;
    },
    enabled: query.length >= 2,
    staleTime: 60 * 1000, // Cache for 1 minute
  });
};
