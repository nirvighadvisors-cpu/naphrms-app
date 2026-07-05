import apiClient from '@/lib/api-client';
import { z } from 'zod';
import type { AuthUser } from '@/store/auth-store';

// Strong password: 8+ chars, 1 upper, 1 lower, 1 number, 1 special char
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#()_\-+=[\]{}|;:'",.<>/\\`~])[A-Za-z\d@$!%*?&^#()_\-+=[\]{}|;:'",.<>/\\`~]{8,}$/;
const strongPasswordMessage =
  'Must have 8+ characters with uppercase, lowercase, number, and special character';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const activateSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(strongPasswordRegex, strongPasswordMessage),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const resetFormSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(strongPasswordRegex, strongPasswordMessage),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type LoginCredentials = z.infer<typeof loginSchema>;
export type ActivateFormValues = z.infer<typeof activateSchema>;

export interface ActivatePayload {
  token: string;
  password: string;
}

export interface AuthResponse {
  message?: string;
  user: AuthUser;
}

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('auth/login', credentials);
    return response.data;
  },

  activateAccount: async (payload: ActivatePayload): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('auth/activate', payload);
    return response.data;
  },

  getMe: async (): Promise<{ user: AuthUser }> => {
    const response = await apiClient.get<{ user: AuthUser }>('auth/me');
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('auth/logout');
  },

  forgotPassword: async (data: { email: string }): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('auth/forgot-password', data);
    return response.data;
  },

  resetPassword: async (data: { token: string; password: string }): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('auth/reset-password', data);
    return response.data;
  },
};
