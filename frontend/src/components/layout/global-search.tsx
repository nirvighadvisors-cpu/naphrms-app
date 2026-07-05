import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Search, User, FileText, Briefcase, Calendar, Clock, DollarSign, Building } from 'lucide-react';
import { useGlobalSearch } from '@/features/search/api/use-search';
import { useAuthStore } from '@/store/auth-store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const QUICK_LINKS = [
  { title: 'My Documents & Vault', path: '/employee/documents', icon: <FileText className="w-4 h-4 text-orange-500" />, keywords: ['documents', 'files', 'vault', 'folder'] },
  { title: 'Company Policies', path: '/employee/documents', icon: <Briefcase className="w-4 h-4 text-purple-500" />, keywords: ['policy', 'policies', 'handbook', 'rules'] },
  { title: 'Attendance & Timesheet', path: '/employee/attendance', icon: <Clock className="w-4 h-4 text-indigo-500" />, keywords: ['attendance', 'time', 'punch', 'timesheet', 'log'] },
  { title: 'Leave Requests', path: '/employee/leaves', icon: <Calendar className="w-4 h-4 text-pink-500" />, keywords: ['leave', 'holiday', 'vacation', 'time off'] },
  { title: 'My Payslips', path: '/employee/payslips', icon: <DollarSign className="w-4 h-4 text-emerald-500" />, keywords: ['payroll', 'payslip', 'salary', 'pay'] },
  { title: 'Employee Directory', path: '/employee/directory', icon: <User className="w-4 h-4 text-blue-500" />, keywords: ['directory', 'colleagues', 'team', 'staff'] },
];

const ADMIN_QUICK_LINKS = [
  { title: 'Manage Employees', path: '/admin/employees', icon: <User className="w-4 h-4 text-blue-500" />, keywords: ['employees', 'staff', 'team', 'manage'] },
  { title: 'Run Payroll', path: '/admin/payroll', icon: <DollarSign className="w-4 h-4 text-emerald-500" />, keywords: ['payroll', 'run payroll', 'salary'] },
  { title: 'Manage Documents', path: '/admin/documents', icon: <FileText className="w-4 h-4 text-orange-500" />, keywords: ['documents', 'vault', 'files'] },
  { title: 'System Settings', path: '/admin/settings', icon: <Building className="w-4 h-4 text-gray-500" />, keywords: ['settings', 'config', 'departments', 'worksites'] },
];

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'HR_ADMIN';

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isLoading } = useGlobalSearch(debouncedQuery);

  const matchedLinks = (isAdmin ? ADMIN_QUICK_LINKS : QUICK_LINKS).filter((link) => 
    link.title.toLowerCase().includes(debouncedQuery.toLowerCase()) || 
    link.keywords.some(kw => kw.includes(debouncedQuery.toLowerCase()))
  );

  const hasResults = (data && Object.values(data).some((arr) => arr.length > 0)) || matchedLinks.length > 0;

  const handleSelect = (path: string) => {
    navigate(path);
    onOpenChange(false);
    setQuery('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[600px] p-0 gap-0 overflow-hidden bg-surface border-border shadow-2xl">
        <VisuallyHidden>
          <DialogTitle>Global Search</DialogTitle>
          <DialogDescription>Search for employees, documents, policies, and more</DialogDescription>
        </VisuallyHidden>
        <div className="flex items-center px-4 py-3 border-b border-border/50">
          <Search className="h-5 w-5 text-text-muted mr-3" />
          <input
            autoFocus
            type="text"
            placeholder="Search employees, documents, policies..."
            className="flex-1 bg-transparent border-none outline-none text-text placeholder:text-text-muted/70 text-base"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {isLoading && <Spinner size="sm" className="ml-2" />}
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {!query && (
            <div className="p-4 text-center text-sm text-text-muted">
              Start typing to search across the application
            </div>
          )}

          {query && !isLoading && !hasResults && (
            <div className="p-4 text-center text-sm text-text-muted">
              No results found for "{query}"
            </div>
          )}

          {hasResults && (
            <div className="space-y-4 py-2">
              {matchedLinks.length > 0 && (
                <ResultSection title="Quick Links">
                  {matchedLinks.map((link) => (
                    <ResultItem
                      key={link.title}
                      icon={link.icon}
                      title={link.title}
                      subtitle="Page Navigation"
                      onClick={() => handleSelect(link.path)}
                    />
                  ))}
                </ResultSection>
              )}

              {data?.employees?.length > 0 && (
                <ResultSection title="Employees">
                  {data.employees.map((emp) => (
                    <ResultItem
                      key={emp.id}
                      icon={<User className="w-4 h-4 text-primary" />}
                      title={`${emp.firstName} ${emp.lastName}`}
                      subtitle={`${emp.employeeCode} • ${emp.designation}`}
                      onClick={() => handleSelect(isAdmin ? `/admin/employees/${emp.id}` : `/employee/directory`)}
                    />
                  ))}
                </ResultSection>
              )}

              {data?.departments?.length > 0 && (
                <ResultSection title="Departments">
                  {data.departments.map((dept) => (
                    <ResultItem
                      key={dept.id}
                      icon={<Building className="w-4 h-4 text-blue-500" />}
                      title={dept.name}
                      subtitle={`Code: ${dept.code}`}
                      onClick={() => handleSelect(isAdmin ? '/admin/settings?tab=departments' : '/employee/directory')}
                    />
                  ))}
                </ResultSection>
              )}

              {data?.documents?.length > 0 && (
                <ResultSection title="Documents">
                  {data.documents.map((doc) => (
                    <ResultItem
                      key={doc.id}
                      icon={<FileText className="w-4 h-4 text-orange-500" />}
                      title={doc.fileName}
                      subtitle={`${doc.type.replace('_', ' ')}${doc.employee ? ` • ${doc.employee.firstName} ${doc.employee.lastName}` : ''}`}
                      onClick={() => handleSelect(isAdmin ? `/admin/employees/${doc.employeeId}?tab=documents` : '/employee/documents')}
                    />
                  ))}
                </ResultSection>
              )}

              {data?.policies?.length > 0 && (
                <ResultSection title="Company Policies">
                  {data.policies.map((policy) => (
                    <ResultItem
                      key={policy.id}
                      icon={<Briefcase className="w-4 h-4 text-purple-500" />}
                      title={policy.title}
                      subtitle={`Version ${policy.version}`}
                      onClick={() => handleSelect(isAdmin ? '/admin/documents' : '/employee/documents')}
                    />
                  ))}
                </ResultSection>
              )}

              {data?.leaveRequests?.length > 0 && (
                <ResultSection title="Leave Requests">
                  {data.leaveRequests.map((leave) => (
                    <ResultItem
                      key={leave.id}
                      icon={<Calendar className="w-4 h-4 text-pink-500" />}
                      title={leave.reason || leave.leaveType.name}
                      subtitle={`${leave.leaveType.name}${leave.employee ? ` • ${leave.employee.firstName} ${leave.employee.lastName}` : ''}`}
                      onClick={() => handleSelect(isAdmin ? '/admin/leaves' : '/employee/leaves')}
                    />
                  ))}
                </ResultSection>
              )}

              {data?.attendance?.length > 0 && (
                <ResultSection title="Attendance Records">
                  {data.attendance.map((record) => (
                    <ResultItem
                      key={record.id}
                      icon={<Clock className="w-4 h-4 text-indigo-500" />}
                      title={`${new Date(record.date).toLocaleDateString()} - ${record.status}`}
                      subtitle={record.employee ? `${record.employee.firstName} ${record.employee.lastName}` : 'My Record'}
                      onClick={() => handleSelect(isAdmin ? '/admin/attendance' : '/employee/attendance')}
                    />
                  ))}
                </ResultSection>
              )}

              {data?.payroll?.length > 0 && (
                <ResultSection title="Payroll Records">
                  {data.payroll.map((pay) => (
                    <ResultItem
                      key={pay.id}
                      icon={<DollarSign className="w-4 h-4 text-emerald-500" />}
                      title={`Payslip - ${new Date(pay.year, pay.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}`}
                      subtitle={`Net Payable: ₹${pay.netPayable.toLocaleString()}${pay.employee ? ` • ${pay.employee.firstName} ${pay.employee.lastName}` : ''}`}
                      onClick={() => handleSelect(isAdmin ? '/admin/payroll' : '/employee/payslips')}
                    />
                  ))}
                </ResultSection>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ResultSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider px-3 mb-2">{title}</h4>
      <div className="flex flex-col gap-1 px-2">{children}</div>
    </div>
  );
}

function ResultItem({ icon, title, subtitle, onClick }: { icon: React.ReactNode; title: string; subtitle?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-md hover:bg-surface-offset focus:bg-surface-offset focus:outline-none transition-colors"
    >
      <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-surface">
        {icon}
      </div>
      <div className="flex-1 overflow-hidden">
        <p className="text-sm font-medium text-text truncate">{title}</p>
        {subtitle && <p className="text-xs text-text-muted truncate">{subtitle}</p>}
      </div>
    </button>
  );
}
