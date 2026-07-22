import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from './auth-api';
import type { LoginCredentials } from './auth-api';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export const useCurrentUser = () => {
  const { setUser } = useAuthStore();

  const query = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        const data = await authApi.getMe();
        setUser(data.user);
        return data.user;
      } catch (error) {
        setUser(null);
        throw error;
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true, // Re-validate session when network reconnects
    refetchOnMount: 'always', // Always re-validate on component mount (app reopen)
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
  });

  return {
    user: query.data ?? null,
    isFetchingUser: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
};

export const useAuth = () => {
  const { setUser, logout: clearStore } = useAuthStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  // ── Login Mutation ──────────────────────────────────────────────
  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    onSuccess: (data) => {
      setUser(data.user);
      
      // Determine redirection route based on role
      const redirectUrl = data.user.role === 'HR_ADMIN' 
        ? '/admin/dashboard' 
        : '/employee/dashboard';
        
      navigate(redirectUrl, { replace: true });
      
      toast({
        title: 'Login successful',
        description: 'Welcome back to NAP HRMS!',
      });
    },
    onError: (error) => {
      let message = 'An unexpected error occurred';
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        message = error.response.data.error;
      }
      
      toast({
        title: 'Login failed',
        description: message,
        variant: 'destructive',
      });
    },
  });

  // ── Logout Mutation ─────────────────────────────────────────────
  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      clearStore();
      queryClient.clear(); // Clear all cached queries
      navigate('/login', { replace: true });
      
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out.',
      });
    },
    onError: () => {
      // Even if API fails, clear local state
      clearStore();
      navigate('/login', { replace: true });
    }
  });

  return {
    login: loginMutation.mutate,
    loginAsync: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
    
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
};
