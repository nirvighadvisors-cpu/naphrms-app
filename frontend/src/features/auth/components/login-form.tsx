import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '../api/auth-api';
import type { LoginCredentials } from '../api/auth-api';
import { useAuth } from '../api/use-auth';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Eye, EyeOff, ShieldAlert, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function LoginForm() {
  const { login, isLoggingIn, loginError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = (data: LoginCredentials) => {
    login(data);
  };

  // Parse the error from the backend
  const errorData = (loginError as any)?.response?.data;
  const errorMessage = errorData?.error || (loginError as any)?.message || '';
  const isLocked = errorData?.code === 'ACCOUNT_LOCKED' || (loginError as any)?.response?.status === 423;
  const isRateLimited = (loginError as any)?.response?.status === 429;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 text-left">
        {/* Lockout Alert */}
        {isLocked && (
          <Alert className="border-red-500/50 bg-red-500/10 text-red-600">
            <ShieldAlert className="h-4 w-4" />
            <AlertDescription className="ml-2 text-sm font-medium">
              {errorMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Rate Limited Alert */}
        {isRateLimited && (
          <Alert className="border-amber-500/50 bg-amber-500/10 text-amber-700">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="ml-2 text-sm font-medium">
              Too many login attempts. Please wait 15 minutes before trying again.
            </AlertDescription>
          </Alert>
        )}

        {/* Generic auth error (wrong password with remaining attempts) */}
        {loginError && !isLocked && !isRateLimited && (
          <Alert className="border-red-500/50 bg-red-500/5 text-red-600">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="ml-2 text-sm">
              {errorMessage}
            </AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input
                  placeholder="name@nirvighadvisors.com"
                  type="email"
                  autoComplete="off"
                  disabled={isLoggingIn || isLocked}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Password</FormLabel>
                <a
                  href="/forgot-password"
                  className="text-sm font-medium text-primary hover:text-primary-hover"
                  tabIndex={-1}
                >
                  Forgot password?
                </a>
              </div>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    autoComplete="new-password"
                    disabled={isLoggingIn || isLocked}
                    {...field}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={isLoggingIn || isLocked}
        >
          {isLoggingIn ? (
            <>
              <Spinner size="sm" variant="white" className="mr-2" />
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </Button>
      </form>
    </Form>
  );
}
