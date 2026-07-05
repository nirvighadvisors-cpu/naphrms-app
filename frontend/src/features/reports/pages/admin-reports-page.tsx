import { useState } from 'react';
import { format } from 'date-fns';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { Users, Calendar as CalendarIcon, IndianRupee, TrendingUp, Activity, Filter } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDashboardStats, useDepartmentDistribution, useExpenseTrends } from '../api/use-reports';
import { useAllLogs } from '@/features/timesheet/api/use-timesheet';

export function AdminReportsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'activity-feed'>('overview');
  const [logDateFilter, setLogDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: stats, isLoading: loadingStats } = useDashboardStats();
  const { data: deptData, isLoading: loadingDept } = useDepartmentDistribution();
  const { data: expenseData, isLoading: loadingExp } = useExpenseTrends();
  
  const { data: allLogs, isLoading: loadingLogs } = useAllLogs({ date: logDateFilter });

  // Custom tooltips for recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface border border-border p-3 rounded-lg shadow-xl">
          <p className="font-medium text-text mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm font-bold" style={{ color: entry.color }}>
              {entry.name}: {entry.name === 'amount' ? `₹${entry.value.toLocaleString()}` : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-page-title font-display text-text">Reports & Analytics</h1>
          <p className="text-text-muted">High-level HR metrics and daily employee activity logs.</p>
        </div>
        
        <div className="flex bg-surface border border-border rounded-lg p-1">
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'overview' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text'}`}
            onClick={() => setActiveTab('overview')}
          >
            <TrendingUp className="w-4 h-4" /> Overview
          </button>
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'activity-feed' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text'}`}
            onClick={() => setActiveTab('activity-feed')}
          >
            <Activity className="w-4 h-4" /> Activity Feed
          </button>
        </div>
      </div>

      {activeTab === 'overview' ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-surface border-border">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-text-muted">Total Active Staff</p>
                    <h3 className="text-3xl font-bold text-text mt-2">{loadingStats ? '-' : stats?.totalEmployees}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-surface border-border">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-text-muted">On Leave Today</p>
                    <h3 className="text-3xl font-bold text-text mt-2">{loadingStats ? '-' : stats?.activeLeavesToday}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-surface border-border">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-text-muted">Reimbursements (Mtd)</p>
                    <h3 className="text-3xl font-bold text-text mt-2">
                      ₹{loadingStats ? '-' : stats?.totalExpensesThisMonth.toLocaleString()}
                    </h3>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <IndianRupee className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-surface border-border">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-text-muted">Avg Performance</p>
                    <h3 className="text-3xl font-bold text-text mt-2">
                      {loadingStats ? '-' : stats?.averagePerformanceRating.toFixed(1)} <span className="text-lg text-text-muted font-normal">/ 5.0</span>
                    </h3>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department Distribution */}
            <Card className="bg-surface border-border">
              <CardHeader>
                <CardTitle>Headcount by Department</CardTitle>
                <CardDescription>Current active employees across departments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  {loadingDept ? (
                    <div className="h-full flex items-center justify-center text-text-muted">Loading chart...</div>
                  ) : !deptData || deptData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-text-muted">No department data available.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={deptData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                        <Bar dataKey="value" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={50} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Expense Trends */}
            <Card className="bg-surface border-border">
              <CardHeader>
                <CardTitle>Reimbursement Trends (6 Months)</CardTitle>
                <CardDescription>Total approved reimbursements over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  {loadingExp ? (
                    <div className="h-full flex items-center justify-center text-text-muted">Loading chart...</div>
                  ) : !expenseData || expenseData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-text-muted">No reimbursement data available.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={expenseData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                        <XAxis 
                          dataKey="month" 
                          stroke="#888888" 
                          fontSize={12} 
                          tickLine={false} 
                          axisLine={false}
                          tickFormatter={(val) => {
                            const [y, m] = val.split('-');
                            return format(new Date(parseInt(y), parseInt(m)-1, 1), 'MMM yyyy');
                          }}
                        />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#1e293b' }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card className="bg-surface border-border">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-border/50 pb-4 gap-4">
            <div>
              <CardTitle>Live Activity Feed</CardTitle>
              <CardDescription>Review daily task bullet points submitted by employees.</CardDescription>
            </div>
            
            <div className="flex gap-2">
              <div className="relative w-40">
                <DatePicker 
                  value={logDateFilter}
                  onChange={(val) => setLogDateFilter(val)}
                  className="bg-background text-sm h-9"
                />
              </div>
              <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
                <Filter className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
             {loadingLogs ? (
                <div className="p-12 text-center text-text-muted">Loading activity logs...</div>
             ) : !allLogs || allLogs.length === 0 ? (
                <div className="p-20 text-center flex flex-col items-center">
                  <Activity className="w-12 h-12 text-border mb-4" />
                  <p className="text-text font-medium text-lg">No Activity Logs Found</p>
                  <p className="text-text-muted">No employees have submitted timesheets for {format(new Date(logDateFilter), 'MMM d, yyyy')}.</p>
                </div>
             ) : (
               <div className="divide-y divide-border/50">
                 {allLogs.map(log => (
                   <div key={log.id} className="p-6 hover:bg-background/30 transition-colors">
                     <div className="flex gap-4">
                        <div className="shrink-0">
                          {log.employee?.profilePhotoUrl ? (
                            <img src={log.employee.profilePhotoUrl} alt="" className="w-12 h-12 rounded-full object-cover border border-border" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold font-display text-lg border border-primary/20">
                              {log.employee?.firstName[0]}{log.employee?.lastName[0]}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-text text-base">{log.employee?.firstName} {log.employee?.lastName}</h4>
                              <p className="text-xs text-text-muted mt-0.5">{log.employee?.department?.name || 'No Dept'} • {log.employee?.employeeCode}</p>
                            </div>
                            <span className="text-xs text-text-muted bg-background px-2 py-1 rounded border border-border">
                              {format(new Date(log.createdAt), 'h:mm a')}
                            </span>
                          </div>
                          
                          <div className="mt-4 p-4 bg-background/50 border border-border/50 rounded-xl">
                            <h5 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3 border-b border-border/50 pb-2">Completed Tasks</h5>
                            <div className="prose prose-sm dark:prose-invert max-w-none font-mono whitespace-pre-wrap text-text leading-relaxed">
                              {log.content}
                            </div>
                          </div>
                        </div>
                     </div>
                   </div>
                 ))}
               </div>
             )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
