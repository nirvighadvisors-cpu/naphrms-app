import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingDown, TrendingUp } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  delta?: string | {
    value: string | number;
    trend: 'up' | 'down' | 'neutral';
    text?: string;
  };
  trend?: 'up' | 'down' | 'neutral';
  description?: string;
  className?: string;
}

export function StatsCard({ title, value, icon, delta, trend, description, className }: StatsCardProps) {
  // Normalize delta: accept both string and object formats
  const deltaObj = typeof delta === 'string'
    ? { value: delta, trend: trend || ('neutral' as const), text: '' }
    : delta;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-text-muted truncate">
              {title}
            </p>
            <div className="flex items-baseline mt-1.5 sm:mt-2 flex-wrap gap-1">
              <h2 className="text-2xl sm:text-3xl font-display font-semibold text-text">
                {value}
              </h2>
              {deltaObj && (
                <div
                  className={cn(
                    'flex items-baseline text-xs sm:text-sm font-medium',
                    {
                      'text-success': deltaObj.trend === 'up',
                      'text-error': deltaObj.trend === 'down',
                      'text-text-muted': deltaObj.trend === 'neutral',
                    }
                  )}
                >
                  {deltaObj.trend === 'up' && <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 self-center" />}
                  {deltaObj.trend === 'down' && <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 self-center" />}
                  {deltaObj.value}
                  {deltaObj.text && (
                    <span className="ml-1 text-text-muted font-normal text-[10px] sm:text-xs">
                      {deltaObj.text}
                    </span>
                  )}
                </div>
              )}
            </div>
            {description && (
              <p className="text-[10px] sm:text-xs text-text-muted mt-1">{description}</p>
            )}
          </div>
          <div className="flex-shrink-0 p-2.5 sm:p-3 bg-primary/10 text-primary rounded-lg">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
