import React, { useState } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Umbrella, Activity, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAllBalances, useAllLeaveRequests } from '@/features/leave/api/use-leave';

export const EmployeeLeaveTab = ({ employeeId }: { employeeId: string }) => {
  const [page, setPage] = useState(1);
  const { data: balancesData, isLoading: loadingBalances } = useAllBalances({ employeeId });
  const { data: requestsData, isLoading: loadingRequests } = useAllLeaveRequests({ employeeId, page, limit: 20 });

  const balances = balancesData?.data || [];
  const requests = requestsData?.data || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED': return <Badge className="bg-success/15 text-success border-0 hover:bg-success/20"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'REJECTED': return <Badge className="bg-error/15 text-error border-0 hover:bg-error/20"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      case 'PENDING': return <Badge className="bg-warning/15 text-warning border-0 hover:bg-warning/20"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Balances Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loadingBalances ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse bg-surface border-border h-24" />
          ))
        ) : balances.length === 0 ? (
          <Card className="col-span-full border-dashed">
            <CardContent className="py-8 text-center text-text-muted">
              No leave balances initialized for this employee.
            </CardContent>
          </Card>
        ) : (
          balances.map((balance: any) => (
            <Card key={balance.id} className="shadow-sm border-border overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                {balance.leaveType.name.toLowerCase().includes('sick') ? <Activity className="w-12 h-12" /> : <Umbrella className="w-12 h-12" />}
              </div>
              <CardContent className="p-4 relative z-10">
                <p className="text-sm font-medium text-text-muted truncate">{balance.leaveType.name}</p>
                <div className="mt-2 flex items-end gap-2">
                  <span className="text-3xl font-display font-semibold text-text">{balance.balance}</span>
                  <span className="text-sm text-text-muted mb-1">/ {balance.totalAllowance}</span>
                </div>
                <div className="mt-2 w-full bg-border rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="h-full bg-primary" 
                    style={{ width: `${Math.min(100, Math.max(0, (balance.balance / balance.totalAllowance) * 100))}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Leave History */}
      <Card className="shadow-sm border-border min-h-[300px]">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle>Leave History</CardTitle>
          <CardDescription>Past and upcoming leave requests for this employee.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto scroll-touch scrollbar-none">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs text-text-muted uppercase bg-background border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium">Dates</th>
                  <th className="px-6 py-4 font-medium">Days</th>
                  <th className="px-6 py-4 font-medium">Reason</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loadingRequests ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-text-muted">Loading requests...</td></tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-text-muted">
                      <CalendarIcon className="w-8 h-8 mx-auto mb-3 opacity-50" />
                      No leave requests found.
                    </td>
                  </tr>
                ) : (
                  requests.map((req: any) => (
                    <tr key={req.id} className="hover:bg-background/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-text">{req.leaveType?.name || 'Leave'}</td>
                      <td className="px-6 py-4 text-text-muted whitespace-nowrap">
                        {format(new Date(req.startDate), 'MMM d, yyyy')} - {format(new Date(req.endDate), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 text-text-muted font-medium">{req.daysCount}</td>
                      <td className="px-6 py-4 text-text-muted max-w-xs truncate" title={req.reason}>
                        {req.reason}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(req.status)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
