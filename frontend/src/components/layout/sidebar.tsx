import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { useAuth } from '@/features/auth/api/use-auth';
import { 
  Building2, 
  LayoutDashboard, 
  Users, 
  CalendarCheck, 
  CalendarRange, 
  IndianRupee, 
  Receipt, 
  Target, 
  FileText, 
  Settings, 
  BarChart3,
  LogOut,
  Clock,
  Megaphone,
  Ticket,
  ShieldCheck,
  Award
} from 'lucide-react';
import { Button } from '../ui/button';

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const isAdmin = user?.role === 'HR_ADMIN';

  const adminLinks = [
    { section: 'DASHBOARD', items: [
      { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard }
    ]},
    { section: 'PEOPLE', items: [
      { name: 'Employees', href: '/admin/employees', icon: Users },
      { name: 'Departments', href: '/admin/departments', icon: Building2 }
    ]},
    { section: 'OPERATIONS', items: [
      { name: 'Attendance', href: '/admin/attendance', icon: CalendarCheck },
      { name: 'Leave', href: '/admin/leave', icon: CalendarRange }
    ]},
    { section: 'FINANCE', items: [
      { name: 'Payroll', href: '/admin/payroll', icon: IndianRupee },
      { name: 'Reimbursement', href: '/admin/expenses', icon: Receipt }
    ]},
    { section: 'DEVELOPMENT', items: [
      { name: 'Performance', href: '/admin/performance', icon: Target }
    ]},
    { section: 'RESOURCES', items: [
      { name: 'Documents', href: '/admin/documents/policies', icon: FileText },
      { name: 'Company Policies', href: '/admin/company-policies', icon: FileText }
    ]},
    { section: 'COMMUNICATION', items: [
      { name: 'Announcements', href: '/admin/announcements', icon: Megaphone },
      { name: 'Recognition', href: '/admin/recognition', icon: Award }
    ]},
    { section: 'INSIGHTS', items: [
      { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
      { name: 'Surveys', href: '/admin/surveys', icon: FileText }
    ]},
    { section: 'SUPPORT', items: [
      { name: 'Helpdesk', href: '/admin/helpdesk', icon: Ticket },
      { name: 'Compliance', href: '/admin/compliance', icon: ShieldCheck }
    ]},
    { section: 'CONFIG', items: [
      { name: 'Settings', href: '/admin/settings', icon: Settings }
    ]}
  ];

  const employeeLinks = [
    { section: 'OVERVIEW', items: [
      { name: 'Dashboard', href: '/employee/dashboard', icon: LayoutDashboard },
      { name: 'My Profile', href: '/employee/profile', icon: Users }
    ]},
    { section: 'PEOPLE', items: [
      { name: 'Employees', href: '/employee/employees', icon: Users }
    ]},
    { section: 'WORK', items: [
      { name: 'My Attendance', href: '/employee/attendance', icon: CalendarCheck },
      { name: 'My Timesheet', href: '/employee/timesheet', icon: Clock },
      { name: 'My Leaves', href: '/employee/leave', icon: CalendarRange }
    ]},
    { section: 'FINANCE', items: [
      { name: 'My Payslips', href: '/employee/payslips', icon: IndianRupee },
      { name: 'My Reimbursements', href: '/employee/expenses', icon: Receipt }
    ]},
    { section: 'CAREER', items: [
      { name: 'My Performance', href: '/employee/performance', icon: Target },
      { name: 'My Documents', href: '/employee/documents', icon: FileText }
    ]},
    { section: 'SUPPORT', items: [
      { name: 'Helpdesk', href: '/employee/helpdesk', icon: Ticket },
      { name: 'Surveys', href: '/employee/surveys', icon: FileText }
    ]}
  ];

  const links = isAdmin ? adminLinks : employeeLinks;

  return (
    <div className="w-64 h-full bg-surface border-r border-border flex flex-col flex-shrink-0 overflow-hidden select-none-touch">
      {/* Logo */}
      <div className="h-14 sm:h-16 flex items-center px-4 sm:px-6 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2 text-primary">
          <img src="/nap-logo.png" alt="NAP Logo" className="w-7 h-7 sm:w-8 sm:h-8 object-contain" />
          <span className="font-display font-bold text-base sm:text-lg tracking-tight text-text">
            NAP <span className="font-medium">HRMS</span>
          </span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto scroll-touch py-3 sm:py-4 px-2 sm:px-3 space-y-5 sm:space-y-6 scrollbar-thin">
        {links.map((group) => (
          <div key={group.section}>
            <h3 className="px-3 text-[10px] sm:text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 sm:mb-2">
              {group.section}
            </h3>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2.5 sm:py-2 rounded-md text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-text-muted hover:text-text hover:bg-surface-offset active:bg-surface-offset'
                      )
                    }
                  >
                    <Icon size={18} className="flex-shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User / Logout */}
      <div className="p-3 sm:p-4 border-t border-border flex-shrink-0 safe-bottom">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-text-muted hover:text-error hover:bg-error/10"
          onClick={() => logout()}
        >
          <LogOut size={18} className="mr-2 flex-shrink-0" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
