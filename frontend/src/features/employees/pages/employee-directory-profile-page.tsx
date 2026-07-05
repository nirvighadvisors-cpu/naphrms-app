import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { useEmployeeDirectoryById } from '../api/use-employees';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building2, Mail, Phone, Calendar, MapPin, Briefcase, ChevronLeft, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

export const EmployeeDirectoryProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data: employee, isLoading, isError } = useEmployeeDirectoryById(id || '');

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isError || !employee) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <h2 className="text-xl font-medium text-text mb-2">Employee Not Found</h2>
        <p className="text-text-muted mb-4">The employee you are looking for does not exist or you do not have permission to view them.</p>
        <Link to="/employee/employees">
          <Button>Back to Directory</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-4">
        <Link to="/employee/employees">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-text-muted hover:text-text">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <PageHeader 
          title="Employee Profile" 
          description="View basic details about this colleague."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="md:col-span-1 bg-surface rounded-xl border border-border overflow-hidden shadow-sm flex flex-col items-center p-8">
          <Avatar className="h-32 w-32 border-4 border-surface shadow-md">
            <AvatarImage src={employee.profilePhotoUrl || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-4xl">
              {employee.firstName[0]}
              {employee.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          
          <h2 className="mt-4 text-2xl font-display font-bold text-text text-center">
            {employee.firstName} {employee.lastName}
          </h2>
          <p className="text-primary font-medium mt-1">{employee.designation}</p>
          <p className="text-text-muted text-sm mt-1">{employee.employeeCode || 'No Employee ID'}</p>
          
          <div className="mt-6 w-full space-y-4">
            {employee.department?.name && (
              <div className="flex items-center gap-3 text-sm text-text-muted bg-background p-3 rounded-lg border border-border/50">
                <Building2 className="w-5 h-5 text-primary/70" />
                <span>{employee.department.name}</span>
              </div>
            )}
            {employee.user?.email && (
              <div className="flex items-center gap-3 text-sm text-text-muted bg-background p-3 rounded-lg border border-border/50">
                <Mail className="w-5 h-5 text-primary/70" />
                <a href={`mailto:${employee.user.email}`} className="hover:text-primary transition-colors">{employee.user.email}</a>
              </div>
            )}
            {employee.phone && (
              <div className="flex items-center gap-3 text-sm text-text-muted bg-background p-3 rounded-lg border border-border/50">
                <Phone className="w-5 h-5 text-primary/70" />
                <a href={`tel:${employee.phone}`} className="hover:text-primary transition-colors">{employee.phone}</a>
              </div>
            )}
          </div>
        </div>

        {/* Details Section */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">
            <div className="border-b border-border p-4 bg-background/50">
              <h3 className="font-medium text-text flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" /> Employment Information
              </h3>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
              <div>
                <p className="text-sm font-medium text-text-muted mb-1">Date of Joining</p>
                <p className="text-text flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary/60" />
                  {employee.dateOfJoining ? format(new Date(employee.dateOfJoining), 'dd MMM yyyy') : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-text-muted mb-1">Date of Birth</p>
                <p className="text-text flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary/60" />
                  {employee.dateOfBirth ? format(new Date(employee.dateOfBirth), 'dd MMM yyyy') : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-text-muted mb-1">Reporting Manager</p>
                <p className="text-text flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                      {employee.manager?.firstName?.[0] || 'M'}
                    </AvatarFallback>
                  </Avatar>
                  {employee.manager ? `${employee.manager.firstName} ${employee.manager.lastName}` : 'None'}
                </p>
              </div>
            </div>
          </div>

          {(employee.emergencyContactName || employee.emergencyContactPhone) && (
            <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">
              <div className="border-b border-border p-4 bg-background/50">
                <h3 className="font-medium text-text flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-primary" /> Emergency Contact
                </h3>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                <div>
                  <p className="text-sm font-medium text-text-muted mb-1">Contact Name</p>
                  <p className="text-text">{employee.emergencyContactName || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-text-muted mb-1">Contact Number</p>
                  <p className="text-text flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary/60" />
                    {employee.emergencyContactPhone ? (
                      <a href={`tel:${employee.emergencyContactPhone}`} className="hover:text-primary transition-colors">
                        {employee.emergencyContactPhone}
                      </a>
                    ) : '-'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
