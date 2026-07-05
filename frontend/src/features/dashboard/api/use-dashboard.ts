import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// ── Types ───────────────────────────────────────────────────

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'URGENT' | 'NORMAL' | 'INFO';
  targetDepartmentId: string | null;
  targetDepartment: { name: string } | null;
  isActive: boolean;
  publishedAt: string;
  expiresAt: string | null;
  authorId: string;
  author: { email?: string; employee?: { firstName: string; lastName: string } };
  isRead?: boolean;
  _count?: { reads: number };
  createdAt: string;
}

export interface TeamUpdates {
  onLeaveToday: Array<{
    id: string;
    startDate: string;
    endDate: string;
    leaveType: { name: string };
    employee: { id: string; firstName: string; lastName: string; profilePhotoUrl: string | null; designation: string };
  }>;
  upcomingBirthdays: Array<{
    id: string;
    firstName: string;
    lastName: string;
    profilePhotoUrl: string | null;
    dateOfBirth: string;
    designation: string;
    birthdayDate: string;
  }>;
  workAnniversaries: Array<{
    id: string;
    firstName: string;
    lastName: string;
    profilePhotoUrl: string | null;
    dateOfJoining: string;
    designation: string;
    years: number;
    anniversaryDate: string;
  }>;
}

export interface LatestPayslip {
  id: string;
  month: number;
  year: number;
  grossEarnings: number;
  totalDeductions: number;
  netPayable: number;
  generatedAt: string;
}

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  type: string;
  actionUrl: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  dueDate: string | null;
}

// ── Hooks ───────────────────────────────────────────────────

export function useActiveAnnouncements() {
  return useQuery<Announcement[]>({
    queryKey: ['announcements', 'active'],
    queryFn: async () => {
      const { data } = await apiClient.get('/announcements/active');
      return data.data;
    },
  });
}

export function useAdminAnnouncements() {
  return useQuery<Announcement[]>({
    queryKey: ['announcements', 'admin'],
    queryFn: async () => {
      const { data } = await apiClient.get('/announcements/admin');
      return data.data;
    },
  });
}

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { title: string; content: string; priority?: string; targetDepartmentId?: string; expiresAt?: string }) => {
      const { data } = await apiClient.post('/announcements', payload);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
}

export function useUpdateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; title?: string; content?: string; priority?: string; isActive?: boolean; expiresAt?: string | null }) => {
      const { data } = await apiClient.patch(`/announcements/${id}`, payload);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/announcements/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
}

export function useMarkAnnouncementRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/announcements/${id}/read`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements', 'active'] });
    },
  });
}

export function useTeamUpdates() {
  return useQuery<TeamUpdates>({
    queryKey: ['dashboard', 'team-updates'],
    queryFn: async () => {
      const { data } = await apiClient.get('/announcements/team-updates');
      return data.data;
    },
  });
}

export function useMyLatestPayslip() {
  return useQuery<LatestPayslip | null>({
    queryKey: ['dashboard', 'my-latest-payslip'],
    queryFn: async () => {
      const { data } = await apiClient.get('/announcements/my-latest-payslip');
      return data.data;
    },
  });
}

export function useActionItems() {
  return useQuery<ActionItem[]>({
    queryKey: ['dashboard', 'action-items'],
    queryFn: async () => {
      const { data } = await apiClient.get('/dashboard/action-items');
      return data.data;
    },
  });
}

