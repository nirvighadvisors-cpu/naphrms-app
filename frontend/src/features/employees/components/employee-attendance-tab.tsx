import React, { useState } from 'react';
import { format } from 'date-fns';
import { Clock, Calendar as CalendarIcon, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAllAttendance } from '@/features/attendance/api/use-attendance';
import { useEmployee, useUpdateEmployee } from '../api/use-employees';
import { Button } from '@/components/ui/button';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export const EmployeeAttendanceTab = ({ employeeId }: { employeeId: string }) => {
  const [page, setPage] = useState(1);
  const { data: attendanceData, isLoading } = useAllAttendance({ employeeId, page, limit: 30 });
  const { data: employee } = useEmployee(employeeId);
  const updateMutation = useUpdateEmployee();

  const handleToggleWeekOff = (day: string) => {
    if (!employee) return;
    updateMutation.mutate({ id: employeeId, data: { weekOffDays: [day] } });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PRESENT': return 'bg-success/15 text-success hover:bg-success/20';
      case 'LATE': return 'bg-warning/15 text-warning hover:bg-warning/20';
      case 'ABSENT': return 'bg-error/15 text-error hover:bg-error/20';
      case 'HALF_DAY': return 'bg-blue-500/15 text-blue-500 hover:bg-blue-500/20';
      case 'WFH': return 'bg-purple-500/15 text-purple-500 hover:bg-purple-500/20';
      default: return 'bg-surface border-border text-text-muted';
    }
  };

  const records = attendanceData?.data || [];

  return (
    <div className="space-y-6">
      <Card className="shadow-sm border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Week Off Configuration</CardTitle>
          <CardDescription>Select the days this employee has off. Changes will instantly apply to their calendar.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => {
              const isSelected = employee?.weekOffDays?.includes(day);
              return (
                <Button
                  key={day}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleToggleWeekOff(day)}
                  disabled={updateMutation.isPending}
                  className={isSelected ? 'bg-primary hover:bg-primary-hover text-primary-foreground' : 'bg-surface hover:bg-surface-offset'}
                >
                  {day.substring(0, 3)}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-border min-h-[400px]">
        <CardHeader className="border-b border-border/50 pb-4">
        <CardTitle>Attendance Log</CardTitle>
        <CardDescription>View the daily attendance records and punch history for this employee.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto scroll-touch scrollbar-none">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-text-muted uppercase bg-background border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Punch In</th>
                <th className="px-6 py-4 font-medium">Punch Out</th>
                <th className="px-6 py-4 font-medium">Work Hours</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-text-muted">Loading attendance...</td></tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-text-muted">
                    <CalendarIcon className="w-8 h-8 mx-auto mb-3 opacity-50" />
                    No attendance records found.
                  </td>
                </tr>
              ) : (
                records.map((record: any) => (
                  <tr key={record.id} className="hover:bg-background/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-text">
                      {format(new Date(record.date), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 text-text-muted">
                      {record.punchInTime ? (
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5" />
                          {format(new Date(record.punchInTime), 'hh:mm a')}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-4 text-text-muted">
                      {record.punchOutTime ? (
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5" />
                          {format(new Date(record.punchOutTime), 'hh:mm a')}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-4 text-text-muted font-medium">
                      {record.workHours ? `${record.workHours.toFixed(1)} hrs` : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={`border-0 ${getStatusColor(record.status)}`}>
                        {record.status.replace('_', ' ')}
                      </Badge>
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
