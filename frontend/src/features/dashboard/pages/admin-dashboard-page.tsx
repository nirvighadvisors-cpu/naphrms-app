import React from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { StatsCard } from '@/components/ui/stats-card';
import { useAuthStore } from '@/store/auth-store';
import { useEmployeeStats } from '@/features/employees/api/use-employees';
import { Users, UserPlus, Building2, TrendingUp, Plus, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = [
  'var(--color-primary)',
  'var(--color-info)',
  'var(--color-success)',
  'var(--color-warning)',
  'var(--color-error)',
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

export const AdminDashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const { data: stats, isLoading } = useEmployeeStats();

  // Simple greeting based on time of day
  const hour = new Date().getHours();
  let greeting = 'Good evening';
  if (hour < 12) greeting = 'Good morning';
  else if (hour < 18) greeting = 'Good afternoon';

  const name = user?.firstName || 'Admin';

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <PageHeader title={`${greeting}, ${name}`} description="Here's what's happening today." />
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 sm:h-32 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <Skeleton className="h-72 sm:h-96 lg:col-span-2 rounded-xl" />
          <Skeleton className="h-72 sm:h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  const activeRate = stats?.activeRate ?? 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader 
        title={`${greeting}, ${name} 👋`} 
        description="Overview of your organization's human resources."
      />

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <Link to="/admin/employees" className="block transition-transform hover:scale-[1.02] active:scale-[0.98]">
          <StatsCard
            title="Total Employees"
            value={stats?.totalEmployees || 0}
            icon={<Users className="h-5 w-5" />}
            delta="+2 this month"
            trend="up"
          />
        </Link>
        <Link to="/admin/employees" className="block transition-transform hover:scale-[1.02] active:scale-[0.98]">
          <StatsCard
            title="New Hires"
            value={stats?.newHiresThisMonth || 0}
            icon={<UserPlus className="h-5 w-5" />}
            description="Joined this month"
          />
        </Link>
        <Link to="/admin/departments" className="block transition-transform hover:scale-[1.02] active:scale-[0.98]">
          <StatsCard
            title="Departments"
            value={stats?.totalDepartments || 0}
            icon={<Building2 className="h-5 w-5" />}
          />
        </Link>
        <StatsCard
          title="Active Rate"
          value={`${activeRate}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          description="Of total workforce"
          trend="up"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Recent Joiners */}
        <Card className="lg:col-span-2 shadow-sm border-border">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
            <div>
              <CardTitle className="text-lg font-display">Recent Joiners</CardTitle>
              <CardDescription>Newest members of the team</CardDescription>
            </div>
            <Link to="/admin/employees">
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
              {stats?.recentJoiners?.length === 0 ? (
                <div className="text-center py-6 text-text-muted">No recent joiners</div>
              ) : (
                stats?.recentJoiners?.map((emp) => (
                  <div key={emp.id} className="flex items-center justify-between gap-3 p-2 sm:p-3 rounded-lg hover:bg-surface-offset/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-8 w-8 sm:h-10 sm:w-10 border border-border flex-shrink-0">
                        <AvatarImage src={emp.profilePhotoUrl || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs sm:text-sm">{emp.firstName[0]}{emp.lastName[0]}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium text-text text-sm truncate">{emp.firstName} {emp.lastName}</p>
                        <p className="text-xs text-text-muted truncate">{emp.designation} • {emp.department?.name}</p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end flex-shrink-0">
                      <span className="text-[10px] sm:text-xs font-medium text-text-muted mb-1 whitespace-nowrap">
                        Joined {new Date(emp.dateOfJoining).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </span>
                      <Badge variant="default" className="text-[10px] h-5 px-1.5 bg-success/15 text-success hover:bg-success/20 border-0">ACTIVE</Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions & Depts */}
        <div className="space-y-6">
          <Card className="shadow-sm border-border bg-gradient-to-br from-primary/5 to-surface">
            <CardHeader>
              <CardTitle className="text-lg font-display">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/admin/employees/new" className="block">
                <Button className="w-full justify-start h-11" variant="default">
                  <Plus className="mr-2 h-4 w-4" /> Add New Employee
                </Button>
              </Link>
              <Link to="/admin/employees" className="block">
                <Button className="w-full justify-start h-11 bg-surface hover:bg-surface-offset text-text border border-border" variant="outline">
                  <Users className="mr-2 h-4 w-4 text-text-muted" /> Manage Directory
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border">
            <CardHeader>
              <CardTitle className="text-lg font-display">Departments</CardTitle>
              <CardDescription>Headcount distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] sm:h-[250px] mt-3 sm:mt-4">
                {stats?.departmentBreakdown && stats.departmentBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.departmentBreakdown}
                        cx="50%"
                        cy="45%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="count"
                        nameKey="department"
                        stroke="none"
                      >
                        {stats.departmentBreakdown.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: '8px' }}
                        itemStyle={{ color: 'var(--color-text)' }}
                      />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-text-muted">No data available</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
