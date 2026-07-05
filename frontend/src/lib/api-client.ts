import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/';

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Send cookies with every request
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor — handle 401 globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't redirect for auth-check calls (expected 401 when not logged in)
    const isAuthCheck = error.config?.url?.includes('auth/me');
    if (error.response?.status === 401 && !isAuthCheck) {
      // Import dynamically to avoid circular deps
      import('@/store/auth-store').then(({ useAuthStore }) => {
        useAuthStore.getState().logout();
      });
    }
    return Promise.reject(error);
  }
);

export default apiClient;
