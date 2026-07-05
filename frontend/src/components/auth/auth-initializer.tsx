import { useCurrentUser } from '@/features/auth/api/use-auth';
import { Spinner } from '@/components/ui/spinner';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { connectSocket, disconnectSocket } from '@/lib/socket';

export function AuthInitializer({ children }: { children: ReactNode }) {
  const { isFetchingUser } = useCurrentUser();

  const { isAuthenticated } = useAuthStore();

  // The hook automatically fetches user on mount due to React Query config

  // Connect/disconnect Socket.IO based on auth state
  useEffect(() => {
    if (isAuthenticated) {
      connectSocket();
    } else {
      disconnectSocket();
    }
  }, [isAuthenticated]);
  
  if (isFetchingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <Spinner size="lg" />
      </div>
    );
  }

  return <>{children}</>;
}
