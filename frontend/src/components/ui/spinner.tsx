import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'white' | 'muted';
}

export function Spinner({ className, size = 'md', variant = 'primary', ...props }: SpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  const variantClasses = {
    primary: 'text-primary',
    white: 'text-white',
    muted: 'text-text-muted',
  };

  return (
    <div
      role="status"
      className={cn('flex items-center justify-center', className)}
      {...props}
    >
      <Loader2
        className={cn(
          'animate-spin',
          sizeClasses[size],
          variantClasses[variant]
        )}
      />
      <span className="sr-only">Loading...</span>
    </div>
  );
}
