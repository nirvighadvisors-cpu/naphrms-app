import React from 'react';
import { useAuditLogs } from '../api/use-payroll';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, PlusCircle, Edit3, Trash2, Lock, FileText, UserPlus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

export const AuditTimeline = () => {
  const { data: logs, isLoading } = useAuditLogs();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No audit logs found.
        </CardContent>
      </Card>
    );
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE': return <PlusCircle className="h-4 w-4 text-emerald-500" />;
      case 'UPDATE': return <Edit3 className="h-4 w-4 text-blue-500" />;
      case 'DELETE': return <Trash2 className="h-4 w-4 text-red-500" />;
      case 'LOCK': return <Lock className="h-4 w-4 text-amber-500" />;
      case 'GENERATE': return <FileText className="h-4 w-4 text-indigo-500" />;
      case 'ASSIGN': return <UserPlus className="h-4 w-4 text-teal-500" />;
      default: return <Edit3 className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getEntityLabel = (entityType: string) => {
    return entityType.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payroll Audit Trail</CardTitle>
        <CardDescription>A complete history of changes made to payroll settings and structures.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-border">
            {logs.map((log) => (
              <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                {/* Icon */}
                <div className="flex items-center justify-center w-5 h-5 rounded-full border border-border bg-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm relative z-10">
                  {getActionIcon(log.action)}
                </div>
                {/* Card */}
                <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-4 rounded-lg border border-border bg-surface shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="font-medium bg-background">
                      {getEntityLabel(log.entityType)}
                    </Badge>
                    <time className="text-xs text-muted-foreground">
                      {format(new Date(log.performedAt), 'MMM d, yyyy h:mm a')}
                    </time>
                  </div>
                  <h4 className="text-sm font-semibold mb-1">
                    {log.action} Action
                  </h4>
                  {log.changes && (
                    <div className="text-xs text-muted-foreground bg-background rounded p-2 mt-2 font-mono overflow-x-auto">
                      {JSON.stringify(log.changes, null, 2)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
