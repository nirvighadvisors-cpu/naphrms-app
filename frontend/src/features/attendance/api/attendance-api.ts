import apiClient from '@/lib/api-client';

// ── Types ─────────────────────────────────────────────────────
export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  punchInTime: string | null;
  punchOutTime: string | null;
  punchInLat: number | null;
  punchInLng: number | null;
  punchOutLat: number | null;
  punchOutLng: number | null;
  workSiteId: string | null;
  source: 'WEB' | 'MOBILE' | 'GPS_VERIFIED';
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LATE' | 'WFH' | 'ON_LEAVE' | 'HOLIDAY' | 'WEEKEND';
  workHours: number | null;
  isRegularized: boolean;
  isAutoPunchedOut: boolean;
  autoPunchOutNote: string | null;
  autoPunchOutTime: string | null;
  punchInPhotoUrl?: string | null;
  punchOutPhotoUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    profilePhotoUrl?: string;
    department?: { name: string };
  };
  regularizationReq?: RegularizationRequest;
}

export interface RegularizationRequest {
  id: string;
  attendanceId: string;
  type: 'REGULAR' | 'WFH';
  reason: string;
  requestedIn: string | null;
  requestedOut: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  reviewedById: string | null;
  reviewedAt: string | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  attendance?: AttendanceRecord;
}

export interface AttendanceSummary {
  presentToday: number;
  absentToday: number;
  lateToday: number;
  wfhToday: number;
  totalEmployees: number;
  avgWorkHours: number;
  monthlyStats: {
    present: number;
    absent: number;
    late: number;
    halfDay: number;
    wfh: number;
    onLeave: number;
  };
}

export interface MyAttendanceSummary {
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  wfh: number;
  onLeave: number;
  totalHours: number;
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

// ── API Functions ─────────────────────────────────────────────
export const attendanceApi = {
  punchIn: async (data: { lat?: number; lng?: number; workSiteId?: string; photoBase64: string }) => {
    const res = await apiClient.post('attendance/punch-in', data);
    return res.data.data;
  },

  punchOut: async (data: { lat?: number; lng?: number; photoBase64: string }) => {
    const res = await apiClient.post('attendance/punch-out', data);
    return res.data.data;
  },

  getToday: async (): Promise<AttendanceRecord | null> => {
    const res = await apiClient.get('attendance/today');
    return res.data.data;
  },

  getMyAttendance: async (params: { startDate?: string; endDate?: string; page?: number; limit?: number }) => {
    const res = await apiClient.get('attendance/my', { params });
    return res.data;
  },

  getAllAttendance: async (params: { startDate?: string; endDate?: string; date?: string; employeeId?: string; departmentId?: string; status?: string; page?: number; limit?: number }): Promise<PaginatedResponse<AttendanceRecord>> => {
    const res = await apiClient.get('attendance', { params });
    return res.data;
  },

  getSummary: async (date?: string): Promise<AttendanceSummary> => {
    const res = await apiClient.get('attendance/summary', { params: { date } });
    return res.data.data;
  },

  markAttendance: async (data: { employeeId: string; date: string; status: string }) => {
    const res = await apiClient.post('attendance/mark', data);
    return res.data.data;
  },

  createRegularization: async (data: { attendanceId?: string; date?: string; type?: 'REGULAR' | 'WFH'; reason: string; requestedIn?: string; requestedOut?: string }) => {
    const res = await apiClient.post('attendance/regularize', data);
    return res.data.data;
  },

  reviewRegularization: async (id: string, data: { status: 'APPROVED' | 'REJECTED'; remarks?: string }) => {
    const res = await apiClient.patch(`attendance/regularize/${id}`, data);
    return res.data;
  },

  getAnalytics: async (employeeId?: string) => {
    const res = await apiClient.get('attendance/analytics', { params: { employeeId } });
    return res.data.data;
  },

  getPendingRegularizations: async (params: { page?: number; limit?: number }) => {
    const res = await apiClient.get('attendance/regularizations', { params });
    return res.data;
  },

  extendPunchOut: async (data: { extensionMinutes: number }) => {
    const res = await apiClient.post('attendance/extend', data);
    return res.data;
  },
};
