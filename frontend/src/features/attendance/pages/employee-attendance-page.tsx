import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { PunchClock } from '../components/punch-clock';
import { AttendanceCalendar } from '../components/attendance-calendar';
import { useMyAttendance, useTodayAttendance, useCreateRegularization } from '../api/use-attendance';
import { useMe } from '@/features/employees/api/use-employees';
import { useHolidays } from '@/features/settings/api/use-holidays';
import { StatsCard } from '@/components/ui/stats-card';
import { CheckCircle, AlertCircle, Clock, Calendar, CalendarPlus, Home, Palmtree } from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isFuture } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import type { AttendanceRecord } from '../api/attendance-api';

export function EmployeeAttendancePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [reason, setReason] = useState('');
  const [requestedIn, setRequestedIn] = useState('');
  const [requestedOut, setRequestedOut] = useState('');
  const [requestType, setRequestType] = useState<'REGULAR' | 'WFH'>('REGULAR');
  const [errorMsg, setErrorMsg] = useState('');
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  const { data: todayData, isLoading: isLoadingToday } = useTodayAttendance();
  const { data: monthData, isLoading: isLoadingMonth } = useMyAttendance({
    startDate: monthStart.toISOString(),
    endDate: monthEnd.toISOString(),
    limit: 100
  });

  const { data: me } = useMe();
  const { data: holidaysData } = useHolidays(currentDate.getFullYear());

  const { mutate: submitRegularization, isPending: isSubmitting } = useCreateRegularization();

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const stats = monthData?.summary;

  const handleDayClick = (date: Date, record?: AttendanceRecord) => {
    if (isFuture(date)) return;
    
    // Only allow regularizing if absent, late, or half day. 
    // If no record exists, it might be an absent day, so we still allow it as long as it's not future.
    // If it's fully present and regularized, maybe don't allow? Let's allow clicking to see status.
    
    const hasPendingReg = record?.regularizationReq?.status === 'PENDING';
    
    if (hasPendingReg) {
      // Could show a toast saying "Already pending" or open a read-only modal
      alert('You already have a pending regularization request for this date.');
      return;
    }

    if (record?.isRegularized) {
      alert('This date has already been regularized.');
      return;
    }

    // Only allow if no record (absent) or bad status
    const status = record?.status;
    if (!status || status === 'ABSENT' || status === 'LATE' || status === 'HALF_DAY') {
      setSelectedDate(date);
      setSelectedRecord(record || null);
      setReason('');
      setRequestedIn('');
      setRequestedOut('');
      setRequestType('REGULAR');
      setErrorMsg('');
      setIsModalOpen(true);
    }
  };

  const handleSubmitReg = () => {
    if (!reason.trim()) {
      setErrorMsg('Please provide a reason for the regularization request.');
      return;
    }
    if (reason.trim().length < 10) {
      setErrorMsg('Reason must be at least 10 characters long.');
      return;
    }
    submitRegularization(
      {
        attendanceId: selectedRecord?.id,
        date: !selectedRecord?.id && selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined,
        type: requestType,
        reason: reason.trim(),
        requestedIn: requestedIn ? new Date(`${format(selectedDate!, 'yyyy-MM-dd')}T${requestedIn}`).toISOString() : undefined,
        requestedOut: requestedOut ? new Date(`${format(selectedDate!, 'yyyy-MM-dd')}T${requestedOut}`).toISOString() : undefined,
      },
      {
        onSuccess: () => {
          setIsModalOpen(false);
        }
      }
    );
  };

  return (
    <div className="space-y-8 pb-10">
      <PageHeader 
        title="My Attendance" 
        description="Track your daily attendance, work hours, and regularization requests."
      />

      <section>
        <PunchClock todayRecord={todayData || null} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <AttendanceCalendar 
            records={monthData?.data || []} 
            month={currentDate.getMonth()}
            year={currentDate.getFullYear()}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onDayClick={handleDayClick}
            holidays={holidaysData || []}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-display mb-2">Monthly Overview</h3>
          <StatsCard 
            title="Present Days" 
            value={stats?.present || 0} 
            icon={<CheckCircle className="h-5 w-5 text-success" />} 
          />
          <StatsCard 
            title="Absent Days" 
            value={stats?.absent || 0} 
            icon={<AlertCircle className="h-5 w-5 text-error" />} 
          />
          <StatsCard 
            title="Late Arrivals" 
            value={stats?.late || 0} 
            icon={<Clock className="h-5 w-5 text-warning" />} 
          />
          <StatsCard 
            title="Total Work Hours" 
            value={`${stats?.totalHours?.toFixed(1) || 0}h`} 
            icon={<CalendarPlus className="h-5 w-5 text-info" />} 
          />
          <StatsCard 
            title="WFH Days" 
            value={stats?.wfh || 0} 
            icon={<Home className="h-5 w-5 text-info" />} 
          />
          <StatsCard 
            title="On Leave" 
            value={stats?.onLeave || 0} 
            icon={<Palmtree className="h-5 w-5 text-purple-500" />} 
          />
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-surface border-border/50 sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Request Attendance Regularization</DialogTitle>
            <DialogDescription>
              Submit a request to correct your attendance for {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : ''}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Request Type Toggle */}
            <div className="space-y-2">
              <Label>Request Type</Label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setRequestType('REGULAR')}
                  className={`flex-1 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    requestType === 'REGULAR'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-bg text-text-muted hover:border-primary/50'
                  }`}
                >
                  <CalendarPlus className="w-4 h-4 mx-auto mb-1" />
                  Regular Attendance
                </button>
                <button
                  type="button"
                  onClick={() => setRequestType('WFH')}
                  className={`flex-1 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    requestType === 'WFH'
                      ? 'border-info bg-info/10 text-info'
                      : 'border-border bg-bg text-text-muted hover:border-info/50'
                  }`}
                >
                  <Home className="w-4 h-4 mx-auto mb-1" />
                  Work From Home
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason <span className="text-error">*</span></Label>
              <Textarea
                id="reason"
                placeholder={requestType === 'WFH' ? 'E.g., Working from home due to...' : 'E.g., Forgot to punch in, Client meeting, System issue...'}
                value={reason}
                onChange={(e) => { setReason(e.target.value); setErrorMsg(''); }}
                className="bg-bg resize-none h-24"
              />
            </div>
            
            {requestType === 'REGULAR' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reqIn">Requested Punch In (Optional)</Label>
                  <Input
                    id="reqIn"
                    type="time"
                    value={requestedIn}
                    onChange={(e) => setRequestedIn(e.target.value)}
                    className="bg-bg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reqOut">Requested Punch Out (Optional)</Label>
                  <Input
                    id="reqOut"
                    type="time"
                    value={requestedOut}
                    onChange={(e) => setRequestedOut(e.target.value)}
                    className="bg-bg"
                  />
                </div>
              </div>
            )}

            {errorMsg && <p className="text-sm text-error font-medium">{errorMsg}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitReg} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
