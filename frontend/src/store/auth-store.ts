import { create } from 'zustand';

export interface AuthUser {
  id: string;
  email: string;
  role: 'HR_ADMIN' | 'EMPLOYEE';
  employeeId?: string;
  firstName?: string;
  lastName?: string;
  profilePhotoUrl?: string;
  isProfileComplete?: boolean;
  profileCompletedAt?: string;
  probationEndsAt?: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    }),

  setLoading: (isLoading) => set({ isLoading }),

  logout: () =>
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    }),
}));
