import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { notificationApi } from './notification-api';
import { getSocket } from '@/lib/socket';
import { useToast } from '@/hooks/use-toast';

export const useNotifications = (params: { page?: number; limit?: number } = {}) => {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: () => notificationApi.list(params),
  });
};

export const useUnreadCount = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewNotification = (data: any) => {
      // Show toast
      if (data && data.title) {
        toast({
          title: data.title,
          description: data.message,
        });
      }
      
      // Invalidate queries so both list and unread count update instantly
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['notifications', 'unreadCount'],
    queryFn: () => notificationApi.getUnreadCount(),
    // Polling removed in favor of Socket.IO
  });
};

export const useMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};
