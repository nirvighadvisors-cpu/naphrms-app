import apiClient from '@/lib/api-client';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  linkUrl?: string;
  createdAt: string;
}

export interface PaginatedNotifications {
  data: Notification[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const notificationApi = {
  list: async (params: { page?: number; limit?: number } = {}): Promise<PaginatedNotifications> => {
    const { data } = await apiClient.get('notifications', { params });
    return data;
  },

  getUnreadCount: async (): Promise<{ count: number }> => {
    const { data } = await apiClient.get('notifications/unread-count');
    return data.data;
  },

  markAsRead: async (id: string): Promise<Notification> => {
    const { data } = await apiClient.patch(`notifications/${id}/read`);
    return data.data;
  },

  markAllAsRead: async (): Promise<{ message: string }> => {
    const { data } = await apiClient.patch('notifications/read-all');
    return data;
  },
};
