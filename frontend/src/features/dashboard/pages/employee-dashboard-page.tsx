import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { 
  CalendarRange, 
  Receipt, 
  Clock, 
  Bell, 
  ArrowRight,
  Sun,
  Megaphone,
  Cake,
  Award,
  CalendarOff,
  IndianRupee,
  Download,
  CheckCircle2,
  AlertTriangle,
  Info,
  Ticket,
  ListTodo,
  ChevronRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, isAfter, startOfDay, parseISO } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// Hooks
import { useTodayAttendance, useAttendanceAnalytics } from '@/features/attendance/api/use-attendance';
import { useMyBalances } from '@/features/leave/api/use-leave';
import { useMyClaims } from '@/features/expense/api/use-expense';
import { useHolidays } from '@/features/settings/api/use-holidays';
import { 
  useActiveAnnouncements, 
  useMarkAnnouncementRead, 
  useTeamUpdates, 
  useMyLatestPayslip,
  useActionItems
} from '../api/use-dashboard';
import { GiveRecognitionDialog } from '@/features/recognition/components/give-recognition-dialog';
import { RecognitionFeed } from '@/features/recognition/components/recognition-feed';

export function EmployeeDashboardPage() {
  const { user } = useAuthStore();
  const [greeting, setGreeting] = useState('');

  const { data: attendanceData } = useTodayAttendance();
  const { data: analyticsData } = useAttendanceAnalytics();
  const { data: balanceData } = useMyBalances();
  const { data: expensesData } = useMyClaims({ limit: 5 });
  const { data: holidaysData } = useHolidays();
  const { data: announcements } = useActiveAnnouncements();
  const { data: teamUpdates } = useTeamUpdates();
  const { data: latestPayslip } = useMyLatestPayslip();
  const { data: actionItems } = useActionItems();
  const markRead = useMarkAnnouncementRead();

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  // Compute stats
  const todayRecord = attendanceData;
  const isPunchedIn = todayRecord?.status === 'PRESENT' && !todayRecord?.punchOutTime;
  
  const balances = balanceData || [];
  const totalAvailableLeave = balances.reduce((acc: number, bal: any) => acc + bal.balance, 0);

  const pendingExpenses = (expensesData?.data || []).filter((e: any) => e.status === 'PENDING');
  const pendingAmount = pendingExpenses.reduce((acc: number, e: any) => acc + e.totalAmount, 0);

  // Next holiday
  const today = startOfDay(new Date());
  const upcomingHolidays = (holidaysData || [])
    .filter((h: any) => isAfter(new Date(h.date), today) || new Date(h.date).getTime() === today.getTime())
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const nextHoliday = upcomingHolidays[0];

  // Unread announcements
  const unreadAnnouncements = (announcements || []).filter((a) => !a.isRead);
  const urgentAnnouncements = (announcements || []).filter((a) => a.priority === 'URGENT');

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="h-full flex flex-col space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-text">
            {greeting}, {user?.firstName}! 👋
          </h1>
          <p className="text-text-muted text-sm mt-1">Here is what's happening today.</p>
        </div>
        <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
          <Link to="/employee/attendance" className="flex-1 sm:flex-initial">
            <Button className={`w-full sm:w-auto text-sm ${isPunchedIn ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-primary text-white'}`}>
              <Clock className="w-4 h-4 mr-1.5" />
              {isPunchedIn ? 'Punch Out' : 'Punch In'}
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Announcements Banner ─────────────────────────────── */}
      {urgentAnnouncements.length > 0 && (
        <Card className="p-4 bg-red-500/5 border-red-500/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-500 text-sm mb-1">Urgent Announcement</h3>
              <p className="font-medium text-text">{urgentAnnouncements[0].title}</p>
              <p className="text-sm text-text-muted mt-1">{urgentAnnouncements[0].content}</p>
            </div>
            {!urgentAnnouncements[0].isRead && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-red-500 hover:bg-red-500/10 flex-shrink-0"
                onClick={() => markRead.mutate(urgentAnnouncements[0].id)}
              >
                <CheckCircle2 className="w-4 h-4 mr-1" /> Got it
              </Button>
            )}
          </div>
        </Card>
      )}

      {unreadAnnouncements.filter(a => a.priority !== 'URGENT').length > 0 && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <Megaphone className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              {unreadAnnouncements.filter(a => a.priority !== 'URGENT').slice(0, 2).map((ann) => (
                <div key={ann.id} className="flex items-start justify-between gap-3 mb-2 last:mb-0">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {ann.priority === 'INFO' ? <Info className="w-3.5 h-3.5 text-blue-500" /> : <Bell className="w-3.5 h-3.5 text-amber-500" />}
                      <span className="font-medium text-text text-sm">{ann.title}</span>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5 line-clamp-1 ml-5.5">{ann.content}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10 flex-shrink-0 text-xs" onClick={() => markRead.mutate(ann.id)}>
                    Mark read
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* ── Stat Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Punch Status Widget */}
        <Card className="min-w-0 p-3 sm:p-5 flex flex-col justify-between bg-surface border-border/50">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className={`p-1.5 sm:p-2 rounded-lg ${isPunchedIn ? 'bg-emerald-500/10 text-emerald-500' : 'bg-text-muted/10 text-text-muted'}`}>
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-medium text-text-muted">Current Status</div>
              <div className={`text-sm sm:text-base font-semibold ${isPunchedIn ? 'text-emerald-500' : 'text-text'}`}>
                {isPunchedIn ? 'Punched In' : 'Not Punched In'}
              </div>
            </div>
          </div>
          <div className="text-xs sm:text-sm text-text-muted">
            {todayRecord?.punchInTime ? (
              <span>In since {format(new Date(todayRecord.punchInTime), 'h:mm a')}</span>
            ) : (
              <span>No punch record yet today</span>
            )}
          </div>
        </Card>

        {/* Expenses Widget */}
        <Card className="min-w-0 p-3 sm:p-5 flex flex-col justify-between bg-surface border-border/50">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="p-1.5 sm:p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
              <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-medium text-text-muted">Pending Claims</div>
              <div className="text-sm sm:text-base font-semibold text-text">₹{pendingAmount.toLocaleString()}</div>
            </div>
          </div>
          <Link to="/employee/expenses" className="text-xs sm:text-sm text-primary hover:underline flex items-center">
            View {pendingExpenses.length} claims <ArrowRight className="w-3 h-3 ml-1" />
          </Link>
        </Card>

        {/* Next Holiday Widget */}
        <Card className="min-w-0 p-3 sm:p-5 flex flex-col justify-between bg-surface border-border/50">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="p-1.5 sm:p-2 rounded-lg bg-rose-500/10 text-rose-500">
              <Sun className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs sm:text-sm font-medium text-text-muted">Next Holiday</div>
              <div className="text-sm sm:text-base font-semibold text-text truncate" title={nextHoliday ? nextHoliday.name : ''}>
                {nextHoliday ? nextHoliday.name : 'None upcoming'}
              </div>
            </div>
          </div>
          <div className="text-xs sm:text-sm text-text-muted">
            {nextHoliday && format(new Date(nextHoliday.date), 'MMMM d, yyyy')}
          </div>
        </Card>
      </div>

      {/* ── Action Items ───────────────────────────────────────── */}
      {actionItems && actionItems.length > 0 && (
        <div className="space-y-2 sm:space-y-3">
          <h3 className="text-base sm:text-lg font-semibold text-text flex items-center">
            <ListTodo className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-primary" />
            Action Items
            <span className="ml-2 bg-rose-500 text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full">{actionItems.length}</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {actionItems.map(item => (
              <Card key={item.id} className="p-4 bg-surface border-border/50 flex flex-col justify-between hover:border-primary/50 transition-colors">
                <Link to={item.actionUrl} className="block h-full flex flex-col">
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-text">{item.title}</h4>
                      {item.priority === 'HIGH' && (
                        <span className="bg-rose-500/10 text-rose-500 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded">High Priority</span>
                      )}
                    </div>
                    <p className="text-sm text-text-muted line-clamp-2">{item.description}</p>
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50 text-xs font-medium">
                    <span className={item.dueDate && new Date(item.dueDate) < new Date() ? 'text-rose-500' : 'text-text-muted'}>
                      {item.dueDate ? `Due ${format(new Date(item.dueDate), 'MMM d, yyyy')}` : 'Action required'}
                    </span>
                    <span className="text-primary flex items-center group-hover:underline">
                      Take Action <ChevronRight className="w-3 h-3 ml-0.5" />
                    </span>
                  </div>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── Attendance Analytics ───────────────────────────────── */}
      {analyticsData && analyticsData.hoursData && analyticsData.hoursData.length > 0 && (
        <Card className="p-3 sm:p-5 bg-surface border-border/50">
          <h3 className="text-base sm:text-lg font-semibold text-text mb-3 sm:mb-4 flex items-center">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-primary" />
            Hours Worked (Last 30 Days)
          </h3>
          <div className="h-48 sm:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analyticsData.hoursData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(val) => format(parseISO(val), 'MMM d')}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                />
                <Tooltip 
                  cursor={{ fill: 'var(--color-surface-offset)' }}
                  contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: '8px' }}
                  labelFormatter={(val) => format(parseISO(val as string), 'MMM d, yyyy')}
                  formatter={(val: number) => [`${val.toFixed(1)} hrs`, 'Work Hours']}
                />
                <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                  {analyticsData.hoursData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.hours >= 8 ? 'var(--color-success)' : 'var(--color-primary)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* ── Bottom Row: Team Updates + Latest Payslip ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 flex-1">

        {/* Left Column: Team Updates & Kudos (2/3 width) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Team Updates Widget */}
          <Card className="p-3 sm:p-5 bg-surface border-border/50 flex flex-col">
            <h3 className="text-base sm:text-lg font-semibold text-text mb-3 sm:mb-4 flex items-center">
              <CalendarOff className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-primary" />
              Team Updates
            </h3>

          <div className="space-y-5 flex-1">
            {/* Who's Away Today */}
            <div>
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Who's Away Today</h4>
              {teamUpdates?.onLeaveToday && teamUpdates.onLeaveToday.length > 0 ? (
                <div className="space-y-2">
                  {teamUpdates.onLeaveToday.map((leave) => (
                    <div key={leave.id} className="flex items-center gap-3 p-2 rounded-lg bg-surface-offset/50">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={leave.employee.profilePhotoUrl || undefined} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {leave.employee.firstName[0]}{leave.employee.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text truncate">{leave.employee.firstName} {leave.employee.lastName}</p>
                        <p className="text-xs text-text-muted">{leave.leaveType.name}</p>
                      </div>
                      <span className="text-xs text-text-muted/70 flex-shrink-0">
                        Until {format(new Date(leave.endDate), 'MMM d')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-muted/70 italic">Everyone is in today! 🎉</p>
              )}
            </div>

            {/* Upcoming Birthdays */}
            {teamUpdates?.upcomingBirthdays && teamUpdates.upcomingBirthdays.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center">
                  <Cake className="w-3.5 h-3.5 mr-1.5 text-pink-500" />
                  Upcoming Birthdays
                </h4>
                <div className="flex flex-wrap gap-3">
                  {teamUpdates.upcomingBirthdays.map((emp) => (
                    <div key={emp.id} className="flex items-center gap-2 px-3 py-2 rounded-full bg-pink-500/5 border border-pink-500/10">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={emp.profilePhotoUrl || undefined} />
                        <AvatarFallback className="text-[10px] bg-pink-500/10 text-pink-500">
                          {emp.firstName[0]}{emp.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-text">{emp.firstName}</span>
                      <span className="text-xs text-text-muted">{format(new Date(emp.birthdayDate), 'MMM d')}</span>
                      <span className="text-sm">🎂</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Work Anniversaries */}
            {teamUpdates?.workAnniversaries && teamUpdates.workAnniversaries.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center">
                  <Award className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                  Work Anniversaries This Month
                </h4>
                <div className="space-y-2">
                  {teamUpdates.workAnniversaries.map((emp) => (
                    <div key={emp.id} className="flex items-center gap-3 p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={emp.profilePhotoUrl || undefined} />
                        <AvatarFallback className="text-xs bg-amber-500/10 text-amber-500">
                          {emp.firstName[0]}{emp.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-text">{emp.firstName} {emp.lastName}</p>
                        <p className="text-xs text-text-muted">{emp.designation}</p>
                      </div>
                      <span className="text-xs font-semibold text-amber-600 bg-amber-500/10 px-2 py-1 rounded-full">
                        🎉 {emp.years} year{emp.years > 1 ? 's' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Recognition & Kudos Widget */}
        <Card className="p-3 sm:p-5 bg-surface border-border/50 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-text flex items-center">
              <Award className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-amber-500" />
              Kudos & Shoutouts
            </h3>
            <GiveRecognitionDialog />
          </div>
          <div className="flex-1 overflow-y-auto max-h-[400px]">
            <RecognitionFeed />
          </div>
        </Card>
      </div>

      {/* Right Column: Latest Payslip + Quick Links */}
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Latest Payslip Card */}
          {latestPayslip && (
            <Card className="p-3 sm:p-5 bg-surface border-border/50">
              <h3 className="text-xs sm:text-sm font-semibold text-text-muted uppercase tracking-wider mb-3 sm:mb-4 flex items-center">
                <IndianRupee className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 text-emerald-500" />
                Latest Payslip
              </h3>
              <div className="text-center mb-3 sm:mb-4">
                <p className="text-xs text-text-muted">
                  {monthNames[latestPayslip.month - 1]} {latestPayslip.year}
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-text mt-1">
                  ₹{latestPayslip.netPayable.toLocaleString()}
                </p>
                <p className="text-xs text-text-muted mt-1">Net Pay</p>
              </div>
              <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Gross Earnings</span>
                  <span className="text-text font-medium">₹{latestPayslip.grossEarnings.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Deductions</span>
                  <span className="text-red-500 font-medium">-₹{latestPayslip.totalDeductions.toLocaleString()}</span>
                </div>
              </div>
              <Link to="/employee/payslips">
                <Button variant="outline" className="w-full border-border/50">
                  <Download className="w-4 h-4 mr-2" />
                  View All Payslips
                </Button>
              </Link>
            </Card>
          )}

          {/* Notifications preview */}
          <Card className="p-3 sm:p-5 bg-surface border-border/50 flex flex-col flex-1">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-xs sm:text-sm font-semibold text-text-muted uppercase tracking-wider flex items-center">
                <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 text-primary" />
                Quick Links
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2 flex-1">
              <Link to="/employee/timesheet" className="p-3 rounded-lg border border-border/50 hover:bg-surface-offset transition-colors flex flex-col items-center justify-center text-center gap-1.5">
                <Clock className="w-5 h-5 text-emerald-500" />
                <span className="font-medium text-text text-xs">Log Timesheet</span>
              </Link>
              <Link to="/employee/leave" className="p-3 rounded-lg border border-border/50 hover:bg-surface-offset transition-colors flex flex-col items-center justify-center text-center gap-1.5">
                <CalendarRange className="w-5 h-5 text-blue-500" />
                <span className="font-medium text-text text-xs">Apply Leave</span>
              </Link>
              <Link to="/employee/helpdesk" className="p-3 rounded-lg border border-border/50 hover:bg-surface-offset transition-colors flex flex-col items-center justify-center text-center gap-1.5">
                <Ticket className="w-5 h-5 text-purple-500" />
                <span className="font-medium text-text text-xs">Helpdesk</span>
              </Link>
              <Link to="/employee/documents" className="p-3 rounded-lg border border-border/50 hover:bg-surface-offset transition-colors flex flex-col items-center justify-center text-center gap-1.5">
                <CheckCircle2 className="w-5 h-5 text-rose-500" />
                <span className="font-medium text-text text-xs">My Documents</span>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
