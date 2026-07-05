import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import type { AttendanceRecord } from '../api/attendance-api';
import { cn } from '@/lib/utils';
import { format, getDaysInMonth, startOfMonth, getDay, isSameDay, isToday } from 'date-fns';

interface AttendanceCalendarProps {
  records: AttendanceRecord[];
  month: number;
  year: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onDayClick?: (date: Date, record?: AttendanceRecord) => void;
  holidays?: any[];
}

export const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({
  records,
  month,
  year,
  onPrevMonth,
  onNextMonth,
  onDayClick,
  holidays = [],
}) => {
  const date = new Date(year, month);
  const daysInMonth = getDaysInMonth(date);
  const firstDayOfMonth = getDay(startOfMonth(date)); // 0 = Sunday, 1 = Monday
  
  // Adjust so Monday is 0
  const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  
  const days = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));
  const blanks = Array.from({ length: startDay }, (_, i) => i);
  
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const getRecordForDay = (day: Date) => {
    return records.find(r => isSameDay(new Date(r.date), day));
  };

  const getDayName = (date: Date) => {
    return ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][date.getDay()];
  };

  const getHolidayForDay = (day: Date) => {
    return holidays.find(h => isSameDay(new Date(h.date), day));
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'PRESENT': return 'bg-success hover:bg-success/80 text-white shadow-sm';
      case 'ABSENT': return 'bg-error hover:bg-error/80 text-white shadow-sm';
      case 'LATE':
      case 'HALF_DAY': return 'bg-warning hover:bg-warning/80 text-white shadow-sm';
      case 'WFH': return 'bg-info hover:bg-info/80 text-white shadow-sm';
      case 'ON_LEAVE': return 'bg-purple-500 hover:bg-purple-600 text-white shadow-sm';
      case 'HOLIDAY':
      case 'WEEKEND': return 'bg-surface-offset text-text-muted';
      default: return 'bg-transparent text-text hover:bg-surface';
    }
  };

  return (
    <Card className="shadow-sm border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg font-display flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-primary" />
          {format(date, 'MMMM yyyy')}
        </CardTitle>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" className="w-8 h-8" onClick={onPrevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="w-8 h-8" onClick={onNextMonth} disabled={month === new Date().getMonth() && year === new Date().getFullYear()}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-xs font-medium text-text-muted py-1">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {blanks.map(blank => (
            <div key={`blank-${blank}`} className="aspect-square rounded-lg bg-transparent" />
          ))}
          
          {days.map(day => {
            const record = getRecordForDay(day);
            const isDayToday = isToday(day);
            const holiday = getHolidayForDay(day);
            
            // Determine status. If no record and it's past, it's missing (red)
            let status = record?.status;
            if (!status && holiday) {
              status = 'HOLIDAY';
            } else if (!status && day < new Date() && !isDayToday) {
              status = 'ABSENT';
            }

            const hasPendingReg = record?.regularizationReq?.status === 'PENDING';
            const isRegularized = record?.isRegularized;

            return (
              <div 
                key={day.toISOString()} 
                onClick={() => onDayClick && onDayClick(day, record)}
                className={cn(
                  "aspect-square rounded-lg flex flex-col items-center justify-center relative transition-colors group",
                  onDayClick ? "cursor-pointer hover:opacity-80" : "",
                  getStatusColor(status),
                  isDayToday && "ring-2 ring-primary ring-offset-2 ring-offset-bg font-bold",
                  (!status || status === 'WEEKEND') && "border border-border/50",
                  hasPendingReg && "after:absolute after:top-1 after:right-1 after:w-2 after:h-2 after:bg-white after:shadow-sm after:rounded-full after:animate-pulse"
                )}
                title={record ? `${status} - ${record.workHours?.toFixed(1) || 0} hrs` : status || 'No record'}
              >
                <span className="text-sm z-10 flex items-center gap-1">
                  {day.getDate()}
                  {isRegularized && <span className="text-[10px] opacity-80" title="Regularized">✓</span>}
                </span>
                
                {holiday && (
                  <span className="text-[8px] leading-tight text-center px-1 mt-0.5 opacity-80 break-words line-clamp-2">
                    bank holiday: {holiday.name.toLowerCase()}
                  </span>
                )}
                
                {/* Tooltip on hover */}
                {record && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 p-2 bg-text text-bg text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-elevated">
                    <p className="font-semibold">{format(day, 'MMM do')}</p>
                    <p className="opacity-90">{record.status}</p>
                    {record.punchInTime && <p className="opacity-90 mt-1">In: {format(new Date(record.punchInTime), 'HH:mm')}</p>}
                    {record.punchOutTime && <p className="opacity-90">Out: {format(new Date(record.punchOutTime), 'HH:mm')}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-3 mt-6 pt-4 border-t border-border/50 text-xs text-text-muted">
          <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-success inline-block"/> Present</div>
          <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-error inline-block"/> Absent</div>
          <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-warning inline-block"/> Late/Half</div>
          <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-info inline-block"/> WFH</div>
          <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-purple-500 inline-block"/> Leave</div>
        </div>
      </CardContent>
    </Card>
  );
};
