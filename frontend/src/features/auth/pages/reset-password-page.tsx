import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { KeyRound, ArrowRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { authApi, resetFormSchema } from '../api/auth-api';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';

type ResetPasswordValues = z.infer<typeof resetFormSchema>;

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetFormSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const { mutate, isPending, error } = useMutation({
    mutationFn: authApi.resetPassword,
    onSuccess: () => {
      setIsSuccess(true);
    },
  });

  const onSubmit = (values: ResetPasswordValues) => {
    if (!token) return;
    mutate({ token, password: values.password });
  };

  if (!token) {
    return (
      <div className="w-full max-w-md animate-fade-in-up">
        <Card className="border-border/50 shadow-2xl bg-surface/80 backdrop-blur-xl">
          <CardHeader className="space-y-3 pb-6 text-center">
            <div className="mx-auto w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mb-2">
              <AlertCircle className="w-8 h-8 text-error" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">Invalid Link</CardTitle>
            <CardDescription className="text-base text-text-muted">
              The password reset link is missing or invalid. Please request a new one.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button className="w-full" asChild>
              <Link to="/forgot-password">Request New Link</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="w-full max-w-md animate-fade-in-up">
        <Card className="border-border/50 shadow-2xl bg-surface/80 backdrop-blur-xl">
          <CardHeader className="space-y-3 pb-6 text-center">
            <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-2">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">Password Reset</CardTitle>
            <CardDescription className="text-base text-text-muted">
              Your password has been successfully reset. You can now log in with your new password.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button className="w-full" onClick={() => navigate('/login')}>
              Proceed to Login <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md animate-fade-in-up">
      <Card className="border-border/50 shadow-2xl bg-surface/80 backdrop-blur-xl">
        <CardHeader className="space-y-3 pb-6">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-2 ring-1 ring-primary/20">
            <KeyRound className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Set New Password</CardTitle>
          <CardDescription className="text-base">
            Please enter your new password below.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{(error as any).response?.data?.error?.message || 'Failed to reset password'}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} className="h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} className="h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full h-11 text-base font-medium mt-2" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  'Reset Password'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
