import type { LeaveBalance } from '../api/leave-api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface LeaveBalanceCardsProps {
  balances: LeaveBalance[];
}

function CircularProgress({ used, total, color }: { used: number; total: number; color: string }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const percentage = total > 0 ? (used / total) * 100 : 0;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-24 h-24">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-border/40"
        />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-display font-bold text-text">{used}</span>
        <span className="text-[10px] text-text-muted font-medium">of {total}</span>
      </div>
    </div>
  );
}

function getColorScheme(remaining: number, total: number) {
  if (total === 0) return { bg: 'from-gray-500/10 to-gray-500/5', ring: 'var(--color-text-muted)', text: 'text-text-muted' };
  const ratio = remaining / total;
  if (ratio > 0.5) return { bg: 'from-emerald-500/10 to-emerald-500/5', ring: '#10b981', text: 'text-emerald-600' };
  if (ratio > 0.25) return { bg: 'from-amber-500/10 to-amber-500/5', ring: '#f59e0b', text: 'text-amber-600' };
  return { bg: 'from-red-500/10 to-red-500/5', ring: '#ef4444', text: 'text-red-600' };
}

export function LeaveBalanceCards({ balances }: LeaveBalanceCardsProps) {
  if (!balances.length) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {balances.map((balance) => {
        const scheme = getColorScheme(balance.remainingDays, balance.totalDays);
        return (
          <Card
            key={balance.id}
            className={cn(
              'overflow-hidden border border-border/60 backdrop-blur-sm',
              'bg-gradient-to-br',
              scheme.bg
            )}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-display font-semibold text-text truncate text-sm">
                    {balance.leaveType.name}
                  </h4>
                  <Badge variant="outline" className="mt-1 text-[10px] px-1.5 py-0">
                    {balance.leaveType.code}
                  </Badge>
                </div>
                <CircularProgress
                  used={balance.usedDays}
                  total={balance.totalDays}
                  color={scheme.ring}
                />
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium">Total</p>
                  <p className="text-sm font-semibold text-text">{balance.totalDays}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium">Used</p>
                  <p className="text-sm font-semibold text-text">{balance.usedDays}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium">Pending</p>
                  <p className="text-sm font-semibold text-amber-600">{balance.pendingDays}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium">Remaining</p>
                  <p className={cn('text-sm font-semibold', scheme.text)}>{balance.remainingDays}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
