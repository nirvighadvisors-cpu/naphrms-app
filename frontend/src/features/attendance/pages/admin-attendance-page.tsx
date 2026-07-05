import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { attendanceColumns } from '../components/attendance-columns';
import { useAllAttendance, useAttendanceSummary, usePendingRegularizations, useReviewRegularization, useAttendanceAnalytics } from '../api/use-attendance';
import { useDepartments } from '@/features/employees/api/use-departments';
import { StatsCard } from '@/components/ui/stats-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar, Users, AlertCircle, Clock, CheckCircle, XCircle, Download } from 'lucide-react';
import { format } from 'date-fns';
import { downloadCSV } from '@/lib/export';
import { DatePicker } from '@/components/ui/date-picker';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export function AdminAttendancePage() {
  const [page, setPage] = useState(1);
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [departmentId, setDepartmentId] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  
  const { data: deptData } = useDepartments();
  const { data: summary } = useAttendanceSummary(date);
  
  const { data: attendanceData, isLoading } = useAllAttendance({
    page,
    limit: 20,
    date: date || undefined,
    ...(departmentId !== 'all' ? { departmentId } : {}),
    ...(status !== 'all' ? { status } : {}),
  });

  const { data: pendingRegData, isLoading: isLoadingReg } = usePendingRegularizations({ page: 1, limit: 50 });
  const reviewMutation = useReviewRegularization();
  const { data: analyticsData } = useAttendanceAnalytics();

  const handleReview = (id: string, status: 'APPROVED' | 'REJECTED') => {
    reviewMutation.mutate({ id, data: { status, remarks: 'Reviewed by admin' } });
  };

  const handleExport = () => {
    if (!attendanceData?.data) return;
    const exportData = attendanceData.data.map((record: any) => ({
      EmployeeName: `${record.employee?.firstName || ''} ${record.employee?.lastName || ''}`,
      Department: record.employee?.department?.name || '',
      Date: format(new Date(record.date), 'yyyy-MM-dd'),
      Status: record.status,
      PunchIn: record.punchInTime ? format(new Date(record.punchInTime), 'hh:mm a') : '',
      PunchOut: record.punchOutTime ? format(new Date(record.punchOutTime), 'hh:mm a') : '',
      WorkHours: record.workHours?.toFixed(2) || '0',
    }));
    downloadCSV(exportData, `Attendance_Export_${date || 'All'}`);
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <PageHeader 
        title="Attendance & Time" 
        description="Manage employee attendance, working hours, and regularization requests."
        action={
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleExport} disabled={!attendanceData?.data?.length}>
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
            <Button>
              <Calendar className="w-4 h-4 mr-2" /> Mark Attendance
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="daily" className="flex-1 flex flex-col">
        <TabsList className="w-fit bg-surface border border-border">
          <TabsTrigger value="daily">Daily Attendance</TabsTrigger>
          <TabsTrigger value="requests">
            Regularization Requests
            {pendingRegData?.pagination.total ? (
              <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                {pendingRegData.pagination.total}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-6 mt-6 flex-1 flex flex-col focus-visible:outline-none focus-visible:ring-0">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard title="Present Today" value={summary?.presentToday || 0} icon={<Users className="h-5 w-5" />} />
            <StatsCard title="Absent Today" value={summary?.absentToday || 0} icon={<AlertCircle className="h-5 w-5 text-error" />} />
            <StatsCard title="Late Arrivals" value={summary?.lateToday || 0} icon={<Clock className="h-5 w-5 text-warning" />} />
            <StatsCard title="Avg Work Hours" value={`${summary?.avgWorkHours.toFixed(1) || 0}h`} icon={<Calendar className="h-5 w-5" />} />
          </div>

          <div className="flex flex-col sm:flex-row justify-between gap-4 items-center bg-surface p-4 rounded-xl border border-border shadow-sm">
            <div className="w-full sm:w-auto">
              <DatePicker 
                value={date} 
                onChange={(val) => setDate(val)} 
                className="bg-bg"
              />
            </div>
            
            <div className="flex w-full sm:w-auto gap-3">
              <Select value={departmentId} onValueChange={(val) => { setDepartmentId(val); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-[200px] bg-bg h-9">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {deptData?.map((dept: any) => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={status} onValueChange={(val) => { setStatus(val); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-[150px] bg-bg h-9">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PRESENT">Present</SelectItem>
                  <SelectItem value="ABSENT">Absent</SelectItem>
                  <SelectItem value="LATE">Late</SelectItem>
                  <SelectItem value="WFH">WFH</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex-1 min-h-[400px] bg-surface rounded-xl border border-border overflow-hidden shadow-sm flex flex-col">
            <DataTable 
              columns={attendanceColumns} 
              data={attendanceData?.data || []}
              isLoading={isLoading}
              emptyStateTitle="No attendance records found"
              emptyStateDescription="Try changing the date or filters to see results."
              pagination={{
                pageIndex: (attendanceData?.pagination.page || 1) - 1,
                pageSize: attendanceData?.pagination.limit || 20,
                pageCount: attendanceData?.pagination.totalPages || -1,
                total: attendanceData?.pagination.total || 0,
              }}
              onPaginationChange={({ pageIndex }) => setPage(pageIndex + 1)}
            />
          </div>
        </TabsContent>

        <TabsContent value="requests" className="mt-6 flex-1 bg-surface rounded-xl border border-border p-6 focus-visible:outline-none focus-visible:ring-0">
          <h3 className="text-lg font-display mb-4">Pending Regularization Requests</h3>
          {isLoadingReg ? (
            <p>Loading...</p>
          ) : !pendingRegData?.data.length ? (
            <p className="text-text-muted">No pending requests.</p>
          ) : (
            <div className="space-y-4">
              {pendingRegData.data.map((req) => (
                <div key={req.id} className="border border-border p-4 rounded-lg bg-bg flex justify-between items-center">
                  <div>
                    <p className="font-medium text-text">
                      {req.attendance?.employee?.firstName} {req.attendance?.employee?.lastName}
                    </p>
                    <p className="text-sm text-text-muted">
                      Date: {req.attendance ? format(new Date(req.attendance.date), 'MMM dd, yyyy') : ''}
                    </p>
                    <p className="text-sm mt-2"><strong>Reason:</strong> {req.reason}</p>
                    {(req.requestedIn || req.requestedOut) && (
                      <p className="text-sm text-info mt-1">
                        <strong>Requested Times:</strong> 
                        {req.requestedIn && ` In: ${format(new Date(req.requestedIn), 'hh:mm a')}`}
                        {req.requestedOut && ` Out: ${format(new Date(req.requestedOut), 'hh:mm a')}`}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      className="bg-success hover:bg-success/90"
                      onClick={() => handleReview(req.id, 'APPROVED')}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" /> Approve
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => handleReview(req.id, 'REJECTED')}
                    >
                      <XCircle className="w-4 h-4 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="mt-6 flex-1 focus-visible:outline-none focus-visible:ring-0 space-y-6">
          <div className="bg-surface rounded-xl border border-border p-6">
            <h3 className="text-lg font-semibold text-text mb-6">Department-wise Average Work Hours (Last 30 Days)</h3>
            <div className="h-[400px] w-full">
              {analyticsData && analyticsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 5 }}>
                    <XAxis type="number" tick={{ fill: 'var(--color-text-muted)' }} />
                    <YAxis type="category" dataKey="department" tick={{ fill: 'var(--color-text-muted)' }} />
                    <Tooltip 
                      cursor={{ fill: 'var(--color-surface-offset)' }}
                      contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: '8px' }}
                      formatter={(val: number) => [`${val.toFixed(2)} hrs`, 'Average Hours']}
                    />
                    <Bar dataKey="avgHours" radius={[0, 4, 4, 0]}>
                      {analyticsData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill="var(--color-primary)" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-text-muted">No data available</div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
