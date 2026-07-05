import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth-store';
import { Spinner } from '@/components/ui/spinner';
import { AppShell } from '@/components/layout/app-shell';
import React from 'react';

interface ProtectedRouteProps {
  allowedRoles?: Array<'HR_ADMIN' | 'EMPLOYEE'>;
  children?: React.ReactNode;
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    // Redirect to login but save the attempted url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // User is logged in but doesn't have permission
    // Redirect to their respective dashboard
    const defaultRoute = user.role === 'HR_ADMIN' ? '/admin/dashboard' : '/employee/dashboard';
    return <Navigate to={defaultRoute} replace />;
  }

  // Onboarding guard: employees must complete their profile before accessing any feature
  if (
    user.role === 'EMPLOYEE' &&
    user.isProfileComplete === false &&
    !location.pathname.startsWith('/onboarding')
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  // Render children wrapped in AppShell
  return (
    <AppShell>
      {children ? children : <Outlet />}
    </AppShell>
  );
}
