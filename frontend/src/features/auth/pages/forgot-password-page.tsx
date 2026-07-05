import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { KeyRound, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { authApi } from '../api/auth-api';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordPage() {
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const { mutate, isPending, error } = useMutation({
    mutationFn: authApi.forgotPassword,
    onSuccess: () => {
      setIsSuccess(true);
    },
  });

  const onSubmit = (values: ForgotPasswordValues) => {
    mutate(values);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4 relative overflow-hidden">
        <div className="w-full max-w-md animate-fade-in-up">
          <Card className="border-border/50 shadow-2xl bg-surface/80 backdrop-blur-xl">
          <CardHeader className="space-y-3 pb-6 text-center">
            <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-2">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">Check your email</CardTitle>
            <CardDescription className="text-base text-text-muted">
              We've sent a password reset link to <span className="font-medium text-text">{form.getValues('email')}</span>.
              The link will expire in 1 hour.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-4">
            <Button variant="outline" className="w-full" asChild>
              <Link to="/login">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Login
              </Link>
            </Button>
          </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4 relative overflow-hidden">
      <div className="w-full max-w-md animate-fade-in-up">
        <Card className="border-border/50 shadow-2xl bg-surface/80 backdrop-blur-xl">
        <CardHeader className="space-y-3 pb-6">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-2 ring-1 ring-primary/20">
            <KeyRound className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Forgot Password?</CardTitle>
          <CardDescription className="text-base">
            Enter your email address and we'll send you a link to reset your password.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{(error as any).response?.data?.error?.message || 'Failed to send reset link'}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Work Email</FormLabel>
                    <FormControl>
                      <Input placeholder="name@company.com" {...field} className="h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full h-11 text-base font-medium" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Sending link...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>

        <CardFooter className="flex justify-center border-t border-border/50 pt-6">
          <Link
            to="/login"
            className="flex items-center text-sm font-medium text-text-muted hover:text-primary transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Login
          </Link>
        </CardFooter>
        </Card>
        </div>
      </div>
    );
}
