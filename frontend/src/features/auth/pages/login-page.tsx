import { AuthLayout } from '@/components/layout/auth-layout';
import { LoginForm } from '../components/login-form';
import { useAuthStore } from '@/store/auth-store';
import { Navigate, useLocation } from 'react-router-dom';

export function LoginPage() {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  // If already logged in, redirect to intended page or dashboard
  if (isAuthenticated && user) {
    const from = location.state?.from?.pathname || (user.role === 'HR_ADMIN' ? '/admin/dashboard' : '/employee/dashboard');
    return <Navigate to={from} replace />;
  }

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to your NAP HRMS account to continue"
    >
      <LoginForm />
    </AuthLayout>
  );
}
