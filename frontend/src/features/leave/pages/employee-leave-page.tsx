import React, { useState, useMemo } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMyBalances, useMyLeaves, useLeaveTypes, useCancelLeave } from '../api/use-leave';
import { LeaveBalanceCards } from '../components/leave-balance-cards';
import { LeaveRequestForm } from '../components/leave-request-form';
import { getEmployeeLeaveColumns } from '../components/leave-columns';
import { CalendarPlus, CalendarDays } from 'lucide-react';

import { useAuthStore } from '@/store/auth-store';
import { differenceInDays } from 'date-fns';

export function EmployeeLeavePage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const user = useAuthStore(state => state.user);

  const { data: balances, isLoading: isLoadingBalances } = useMyBalances();
  const { data: leaveTypes, isLoading: isLoadingTypes } = useLeaveTypes();
  const { data: leavesData, isLoading: isLoadingLeaves } = useMyLeaves({
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    limit: 50,
  });
  const cancelMutation = useCancelLeave();

  const handleCancel = (id: string) => {
    cancelMutation.mutate(id);
  };

  const columns = useMemo(() => getEmployeeLeaveColumns(handleCancel), []);

  const probationEndsAt = user?.probationEndsAt ? new Date(user.probationEndsAt) : null;
  const profileCompletedAt = user?.profileCompletedAt ? new Date(user.profileCompletedAt) : null;
  const isProbationActive = probationEndsAt ? new Date() < probationEndsAt : false;
  const probationDaysRemaining = probationEndsAt ? differenceInDays(probationEndsAt, new Date()) : 0;

  return (
    <div className="space-y-8 pb-10">
      <PageHeader
        title="My Leaves"
        description="View your leave balances, apply for leave, and track your requests."
        action={
          leaveTypes && leaveTypes.length > 0 ? (
            <LeaveRequestForm
              leaveTypes={leaveTypes}
              isProbationActive={isProbationActive}
              probationDaysRemaining={probationDaysRemaining}
              trigger={
                <Button>
                  <CalendarPlus className="w-4 h-4 mr-2" />
                  Apply Leave
                </Button>
              }
            />
          ) : undefined
        }
      />

      {isProbationActive && probationEndsAt && profileCompletedAt && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 p-4 rounded-xl shadow-sm text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <p className="font-medium mb-1">You are currently in your probation period.</p>
            <p className="opacity-80">
              Casual Leave (CL) and Privilege Leave (PL) will be available after your probation period ends in <strong>{probationDaysRemaining} day(s)</strong>.
            </p>
          </div>
          <div className="text-left sm:text-right text-xs opacity-70">
            <div>Profile Completed: {profileCompletedAt.toLocaleDateString()}</div>
            <div>Probation Ends: {probationEndsAt.toLocaleDateString()}</div>
          </div>
        </div>
      )}

      {/* Leave Balance Cards */}
      <section>
        {isLoadingBalances ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-xl" />
            ))}
          </div>
        ) : balances && balances.length > 0 ? (
          <LeaveBalanceCards balances={balances} />
        ) : (
          <EmptyState
            icon={<CalendarDays className="h-8 w-8" />}
            title="No leave balances"
            description="Your leave balances have not been initialized yet. Contact HR for assistance."
          />
        )}
      </section>

      {/* Leave Requests Table */}
      <section className="space-y-4">
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
          <div className="flex justify-center sm:justify-start">
            <TabsList className="w-full sm:w-fit grid grid-cols-4 sm:flex bg-surface border border-border h-auto py-1">
              <TabsTrigger value="all" className="text-[11px] sm:text-sm px-1 sm:px-4 py-1.5">All</TabsTrigger>
              <TabsTrigger value="PENDING" className="text-[11px] sm:text-sm px-1 sm:px-4 py-1.5">Pending</TabsTrigger>
              <TabsTrigger value="APPROVED" className="text-[11px] sm:text-sm px-1 sm:px-4 py-1.5">Approved</TabsTrigger>
              <TabsTrigger value="REJECTED" className="text-[11px] sm:text-sm px-1 sm:px-4 py-1.5">Rejected</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={statusFilter} className="mt-4 focus-visible:outline-none focus-visible:ring-0">
            <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">
              <DataTable
                columns={columns}
                data={leavesData?.data || []}
                isLoading={isLoadingLeaves}
                emptyStateTitle="No leave requests"
                emptyStateDescription={
                  statusFilter !== 'all'
                    ? `You have no ${statusFilter.toLowerCase()} leave requests.`
                    : 'You haven\'t applied for any leave yet. Click "Apply Leave" to get started.'
                }
              />
            </div>
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}
