import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { AuthLayout } from '@/components/layout/auth-layout';
import { activateSchema, authApi } from '../api/auth-api';
import type { ActivateFormValues } from '../api/auth-api';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/hooks/use-toast';

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
import { Eye, EyeOff, Check, X, ShieldCheck, AlertTriangle } from 'lucide-react';

// Password strength calculator
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score: 1, label: 'Weak', color: 'bg-red-500' };
  if (score <= 3) return { score: 2, label: 'Fair', color: 'bg-amber-500' };
  if (score <= 4) return { score: 3, label: 'Good', color: 'bg-blue-500' };
  return { score: 4, label: 'Strong', color: 'bg-emerald-500' };
}

export function ActivateAccountPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const { setUser } = useAuthStore();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const form = useForm<ActivateFormValues>({
    resolver: zodResolver(activateSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const watchedPassword = form.watch('password');
  const strength = useMemo(() => getPasswordStrength(watchedPassword || ''), [watchedPassword]);

  const passwordChecks = useMemo(() => {
    const pw = watchedPassword || '';
    return [
      { label: 'At least 8 characters', met: pw.length >= 8 },
      { label: 'Contains uppercase letter', met: /[A-Z]/.test(pw) },
      { label: 'Contains lowercase letter', met: /[a-z]/.test(pw) },
      { label: 'Contains a number', met: /[0-9]/.test(pw) },
      { label: 'Contains special character', met: /[^A-Za-z0-9]/.test(pw) },
    ];
  }, [watchedPassword]);

  const activateMutation = useMutation({
    mutationFn: (data: ActivateFormValues) =>
      authApi.activateAccount({ token: token!, password: data.password }),
    onSuccess: (response) => {
      setUser(response.user);
      toast({
        title: '🎉 Account Activated!',
        description: 'Welcome aboard! Redirecting you to complete your profile...',
      });
      // Short delay so the user sees the success toast
      setTimeout(() => {
        // Employee goes to onboarding, HR_ADMIN goes to dashboard
        if (response.user.role === 'EMPLOYEE') {
          navigate('/onboarding', { replace: true });
        } else {
          navigate('/admin/dashboard', { replace: true });
        }
      }, 1500);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Activation failed. Please try again.';
      toast({
        title: 'Activation Failed',
        description: message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: ActivateFormValues) => {
    activateMutation.mutate(data);
  };

  // No token in URL — show error state
  if (!token) {
    return (
      <AuthLayout title="Invalid Link" subtitle="No activation token found">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <p className="text-text-muted text-sm">
            This activation link appears to be invalid or incomplete. Please check your email for the correct link, or contact your HR administrator.
          </p>
          <Link to="/login">
            <Button variant="outline" className="mt-4">Go to Login</Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  // Success state
  if (activateMutation.isSuccess) {
    return (
      <AuthLayout title="Account Activated!" subtitle="You're all set">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center animate-[scale-in_0.3s_ease-out]">
            <ShieldCheck className="h-8 w-8 text-emerald-500" />
          </div>
          <p className="text-text-muted text-sm">
            Your account has been activated and you are now signed in. Redirecting you...
          </p>
          <div className="flex justify-center">
            <Spinner size="sm" />
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Set Your Password"
      subtitle="Create a secure password to activate your NAP HRMS account"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 text-left">
          {/* New Password */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a strong password"
                      autoComplete="new-password"
                      disabled={activateMutation.isPending}
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text focus:outline-none"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Password Strength Indicator */}
          {watchedPassword && (
            <div className="space-y-3 animate-[fade-in_0.2s_ease-out]">
              {/* Strength bar */}
              <div className="space-y-1.5">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                        i <= strength.score ? strength.color : 'bg-border'
                      }`}
                    />
                  ))}
                </div>
                <p className={`text-xs font-medium ${
                  strength.score <= 1 ? 'text-red-500' :
                  strength.score <= 2 ? 'text-amber-500' :
                  strength.score <= 3 ? 'text-blue-500' : 'text-emerald-500'
                }`}>
                  {strength.label}
                </p>
              </div>

              {/* Password requirement checklist */}
              <div className="grid grid-cols-1 gap-1">
                {passwordChecks.map((check) => (
                  <div key={check.label} className="flex items-center gap-2 text-xs">
                    {check.met ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <X className="h-3.5 w-3.5 text-text-muted/50 shrink-0" />
                    )}
                    <span className={check.met ? 'text-text' : 'text-text-muted/70'}>
                      {check.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Confirm Password */}
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
                      disabled={activateMutation.isPending}
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text focus:outline-none"
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            disabled={activateMutation.isPending}
          >
            {activateMutation.isPending ? (
              <>
                <Spinner size="sm" variant="white" className="mr-2" />
                Activating...
              </>
            ) : (
              'Activate Account'
            )}
          </Button>

          <p className="text-center text-xs text-text-muted">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:text-primary-hover font-medium">
              Sign in
            </Link>
          </p>
        </form>
      </Form>
    </AuthLayout>
  );
}
