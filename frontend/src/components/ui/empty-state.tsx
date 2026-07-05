import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 min-h-[300px] border border-dashed rounded-xl bg-surface/50 border-[var(--color-border)]',
        className
      )}
    >
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-surface-offset mb-4 text-text-muted">
        {icon}
      </div>
      <h3 className="text-section-heading font-display text-text mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-body text-text-muted max-w-md mb-6">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
