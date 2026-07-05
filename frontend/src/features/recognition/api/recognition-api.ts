import apiClient from '@/lib/api-client';

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string | null;
  isActive: boolean;
}

export interface Recognition {
  id: string;
  senderId: string;
  receiverId: string;
  badgeId: string;
  message: string;
  isPublic: boolean;
  createdAt: string;
  badge: Badge;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhotoUrl: string | null;
    department?: { name: string };
  };
  receiver: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhotoUrl: string | null;
    department?: { name: string };
  };
}

export const recognitionApi = {
  getBadges: async (includeInactive?: boolean) => {
    const res = await apiClient.get('recognition/badges', { params: { includeInactive } });
    return res.data.data;
  },

  createBadge: async (data: any) => {
    const res = await apiClient.post('recognition/badges', data);
    return res.data.data;
  },

  updateBadge: async (id: string, data: any) => {
    const res = await apiClient.patch(`recognition/badges/${id}`, data);
    return res.data.data;
  },

  getFeed: async (params: { page?: number; limit?: number }) => {
    const res = await apiClient.get('recognition/feed', { params });
    return res.data;
  },

  sendRecognition: async (data: { receiverId: string; badgeId: string; message: string; isPublic?: boolean }) => {
    const res = await apiClient.post('recognition/send', data);
    return res.data.data;
  },
};
