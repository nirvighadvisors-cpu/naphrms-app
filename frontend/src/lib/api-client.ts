import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/';

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Send cookies with every request
  headers: {
    'Content-Type': 'application/json',
  },
});

// Track whether a token refresh attempt is already in flight
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: any) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve();
    }
  });
  failedQueue = [];
};

// Response interceptor — handle 401 with automatic retry
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Don't retry for auth-check calls or if already retried
    const isAuthCheck = originalRequest?.url?.includes('auth/me');
    const isLoginCall = originalRequest?.url?.includes('auth/login');
    const isActivateCall = originalRequest?.url?.includes('auth/activate');

    if (
      error.response?.status === 401 &&
      !isAuthCheck &&
      !isLoginCall &&
      !isActivateCall &&
      !originalRequest._retry
    ) {
      // The backend middleware may have issued a fresh cookie via the grace period.
      // Retry the original request once — if the new cookie is valid, it will succeed.
      if (isRefreshing) {
        // If another refresh is already in progress, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => apiClient(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Try to validate the session — the backend will issue a new cookie
        // if the old token is within the 24h grace period
        await apiClient.get('auth/me');
        processQueue(null);
        // Session is valid — retry the original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        // Session truly expired — logout
        import('@/store/auth-store').then(({ useAuthStore }) => {
          useAuthStore.getState().logout();
        });
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // For auth/me 401s (expected when not logged in), just reject without redirect
    if (error.response?.status === 401 && !isAuthCheck && !isLoginCall && !isActivateCall) {
      import('@/store/auth-store').then(({ useAuthStore }) => {
        useAuthStore.getState().logout();
      });
    }

    return Promise.reject(error);
  }
);

export default apiClient;
