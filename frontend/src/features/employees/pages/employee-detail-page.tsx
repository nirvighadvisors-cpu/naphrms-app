import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { useEmployee, useUpdateEmployeeStatus, useEmployeeStatusHistory } from '../api/use-employees';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmployeeDocumentsTab } from '../components/employee-documents-tab';
import { EmployeeOfferLetterCard } from '../components/employee-offer-letter-card';
import { EmployeeAttendanceTab } from '../components/employee-attendance-tab';
import { EmployeeLeaveTab } from '../components/employee-leave-tab';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Ban, CheckCircle, Mail, Phone, Building2, UserMinus, History, Clock, ArrowRight, User } from 'lucide-react';
import { format } from 'date-fns';

const InfoRow = ({ label, value }: { label: string; value?: string | null }) => (
  <div className="py-3 border-b border-border/50 last:border-0 flex justify-between items-start md:block">
    <dt className="text-xs md:text-sm text-text-muted font-medium mb-1">{label}</dt>
    <dd className="text-sm font-medium text-text md:mt-0.5 break-words">{value || '—'}</dd>
  </div>
);

const statusColor: Record<string, string> = {
  ACTIVE: 'bg-emerald-500',
  INACTIVE: 'bg-amber-500',
  TERMINATED: 'bg-rose-500',
  ON_LEAVE: 'bg-sky-500',
};

const statusBadgeClass: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  INACTIVE: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  TERMINATED: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  ON_LEAVE: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
};

export const EmployeeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data: employee, isLoading, error } = useEmployee(id!);
  const { mutate: updateStatus, isPending: isUpdatingStatus } = useUpdateEmployeeStatus();

  // Modal states
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusModalTarget, setStatusModalTarget] = useState<'INACTIVE' | 'TERMINATED' | 'ACTIVE' | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const { data: historyData, isLoading: loadingHistory } = useEmployeeStatusHistory(isHistoryModalOpen ? id! : '');


  const openStatusModal = (target: 'INACTIVE' | 'TERMINATED' | 'ACTIVE') => {
    setStatusModalTarget(target);
    setStatusReason('');
    setReasonError('');
    setIsStatusModalOpen(true);
  };

  const handleStatusSubmit = () => {
    if (!statusReason.trim()) {
      setReasonError('Please provide a reason for this status change.');
      return;
    }
    if (!statusModalTarget) return;
    updateStatus(
      { id: id!, status: statusModalTarget, reason: statusReason.trim() },
      {
        onSuccess: () => {
          setIsStatusModalOpen(false);
          setStatusReason('');
          setStatusModalTarget(null);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <PageHeader title="Loading Profile..." />
        <Card className="h-48"><Skeleton className="h-full w-full" /></Card>
        <Skeleton className="h-[400px] w-full mt-6" />
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <EmptyState icon={<UserMinus />} title="Employee not found" description="The employee you're looking for doesn't exist or you don't have permission to view them." />
      </div>
    );
  }

  const initials = `${employee.firstName[0]}${employee.lastName[0]}`;
  const fullName = `${employee.firstName} ${employee.lastName}`;
  const isActive = employee.status === 'ACTIVE';

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <PageHeader 
        title={fullName} 
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin/dashboard' },
          { label: 'Employees', href: '/admin/employees' },
          { label: fullName }
        ]}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/admin/employees/${employee.id}/edit`}>
                <Edit className="h-4 w-4 mr-2" /> Edit
              </Link>
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="gap-2"
              onClick={() => setIsHistoryModalOpen(true)}
            >
              <History className="h-4 w-4" /> View History
            </Button>
            {isActive ? (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="bg-warning/10 text-warning hover:bg-warning/20 border border-warning/20"
                  onClick={() => openStatusModal('INACTIVE')}
                  disabled={isUpdatingStatus}
                >
                  <UserMinus className="h-4 w-4 mr-2" /> {isUpdatingStatus ? 'Updating...' : 'Mark Inactive'}
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="bg-error/10 text-error hover:bg-error/20 border border-error/20"
                  onClick={() => openStatusModal('TERMINATED')}
                  disabled={isUpdatingStatus}
                >
                  <Ban className="h-4 w-4 mr-2" /> {isUpdatingStatus ? 'Terminating...' : 'Terminate'}
                </Button>
              </>
            ) : (
              <Button 
                variant="default" 
                size="sm" 
                className="bg-success text-white hover:bg-success/90"
                onClick={() => openStatusModal('ACTIVE')}
                disabled={isUpdatingStatus}
              >
                <CheckCircle className="h-4 w-4 mr-2" /> {isUpdatingStatus ? (employee.status === 'TERMINATED' ? 'Rehiring...' : 'Activating...') : (employee.status === 'TERMINATED' ? 'Rehire Employee' : 'Activate')}
              </Button>
            )}
          </div>
        }
      />

      {/* ═══ Status Change Modal ═══ */}
      <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
        <DialogContent className="bg-surface border-border/50 sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {statusModalTarget === 'INACTIVE' ? 'Mark Employee Inactive' : statusModalTarget === 'TERMINATED' ? 'Terminate Employee' : (employee?.status === 'TERMINATED' ? 'Rehire Employee' : 'Activate Employee')}
            </DialogTitle>
            <DialogDescription>
              Please provide a mandatory reason for {statusModalTarget === 'ACTIVE' && employee?.status === 'TERMINATED' ? 'rehiring' : `changing status to ${statusModalTarget}`} <strong>{fullName}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason <span className="text-rose-500">*</span></Label>
              <Textarea
                id="reason"
                placeholder="e.g. Resigned voluntarily, End of contract, Performance issues..."
                value={statusReason}
                onChange={(e) => { setStatusReason(e.target.value); setReasonError(''); }}
                className="bg-background min-h-[100px]"
              />
              {reasonError && <p className="text-xs text-rose-500">{reasonError}</p>}
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsStatusModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleStatusSubmit}
              disabled={isUpdatingStatus}
              className={statusModalTarget === 'ACTIVE' ? 'bg-success hover:bg-success/90 text-white' : statusModalTarget === 'INACTIVE' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-rose-600 hover:bg-rose-700 text-white'}
            >
              {isUpdatingStatus ? 'Updating...' : `Confirm ${statusModalTarget === 'INACTIVE' ? 'Inactive' : statusModalTarget === 'TERMINATED' ? 'Termination' : 'Rehire/Activation'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Status History Timeline Modal ═══ */}
      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className="bg-surface border-border/50 sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5 text-primary" /> Status Timeline
            </DialogTitle>
            <DialogDescription>
              Complete audit trail of status changes for <strong>{fullName}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {loadingHistory ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[17px] top-2 bottom-2 w-0.5 bg-border" />

                {/* Joining date entry */}
                {historyData?.employee && (
                  <div className="relative flex gap-4 pb-6">
                    <div className="relative z-10 w-9 h-9 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="pt-1 flex-1">
                      <p className="text-sm font-semibold text-text">Employee Joined</p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {format(new Date(historyData.employee.dateOfJoining), 'MMMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                )}

                {/* Status change entries */}
                {historyData?.history.map((entry) => (
                  <div key={entry.id} className="relative flex gap-4 pb-6 last:pb-0">
                    <div className={`relative z-10 w-9 h-9 rounded-full ${statusColor[entry.toStatus] || 'bg-gray-400'} flex items-center justify-center shrink-0 shadow-sm`}>
                      {entry.toStatus === 'ACTIVE' && <CheckCircle className="w-4 h-4 text-white" />}
                      {entry.toStatus === 'INACTIVE' && <UserMinus className="w-4 h-4 text-white" />}
                      {entry.toStatus === 'TERMINATED' && <Ban className="w-4 h-4 text-white" />}
                      {entry.toStatus === 'ON_LEAVE' && <Clock className="w-4 h-4 text-white" />}
                    </div>
                    <div className="pt-0.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {entry.fromStatus && (
                          <>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusBadgeClass[entry.fromStatus] || ''}`}>
                              {entry.fromStatus}
                            </Badge>
                            <ArrowRight className="w-3 h-3 text-text-muted shrink-0" />
                          </>
                        )}
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusBadgeClass[entry.toStatus] || ''}`}>
                          {entry.toStatus}
                        </Badge>
                      </div>
                      {entry.reason && (
                        <p className="text-sm text-text mt-1.5 bg-background/80 border border-border/50 rounded-lg px-3 py-2 italic">
                          "{entry.reason}"
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(entry.createdAt), 'MMM d, yyyy • h:mm a')}
                        </span>
                        <span>by <span className="font-medium text-text">{entry.changedBy}</span></span>
                      </div>
                    </div>
                  </div>
                ))}

                {(!historyData?.history || historyData.history.length === 0) && (
                  <div className="text-center py-8 text-text-muted">
                    <History className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>No status changes recorded yet.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Header Card */}
      <Card className="overflow-hidden border-border shadow-sm">
        <div className="h-24 md:h-32 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent w-full"></div>
        <CardContent className="relative px-6 md:px-8 pb-6">
          <div className="flex flex-col md:flex-row gap-6 md:items-end -mt-12 md:-mt-16 mb-6">
            <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-surface shadow-md bg-surface">
              <AvatarImage src={employee.profilePhotoUrl || undefined} className="object-cover" />
              <AvatarFallback className="text-3xl font-display font-semibold bg-primary/10 text-primary">{initials}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-2">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 justify-between">
                <div>
                  <h1 className="text-2xl md:text-3xl font-display font-semibold text-text">{fullName}</h1>
                  <p className="text-text-muted mt-1 font-medium">{employee.designation} • {employee.department?.name}</p>
                </div>
                <div className="flex items-center gap-2 mt-2 md:mt-0">
                  <Badge variant={isActive ? 'default' : 'destructive'} className={isActive ? 'bg-success/15 text-success hover:bg-success/20 border-0' : 'bg-error text-white hover:bg-error/90 border-0'}>
                    {employee.status === 'INACTIVE' && employee.dateOfLeaving
                      ? `INACTIVE SINCE ${new Date(employee.dateOfLeaving).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}`
                      : employee.status}
                  </Badge>
                  <Badge variant="outline">{employee.employeeCode}</Badge>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-border/50">
            <div className="flex items-center gap-3 text-sm text-text-muted">
              <Mail className="h-4 w-4" /> <span>{employee.user?.email || 'No work email'}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-text-muted">
              <Phone className="h-4 w-4" /> <span>{employee.phone || 'No phone number'}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-text-muted">
              <Building2 className="h-4 w-4" /> <span>Joined {new Date(employee.dateOfJoining).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Section */}
      <Tabs defaultValue="overview" className="w-full mt-6">
        <TabsList className="w-full justify-start h-auto p-1 bg-surface border border-border overflow-x-auto rounded-lg">
          <TabsTrigger value="overview" className="px-6 py-2.5 rounded-md data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none">Overview</TabsTrigger>
          <TabsTrigger value="documents" className="px-6 py-2.5 rounded-md data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none">Documents</TabsTrigger>
          <TabsTrigger value="attendance" className="px-6 py-2.5 rounded-md data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none">Attendance</TabsTrigger>
          <TabsTrigger value="leave" className="px-6 py-2.5 rounded-md data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none">Leave</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-6 space-y-6">
          <EmployeeOfferLetterCard employee={employee} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Personal Info */}
            <Card className="shadow-sm border-border">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-lg">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 grid grid-cols-2 gap-x-4">
                <InfoRow label="Gender" value={employee.gender} />
                <InfoRow label="Date of Birth" value={employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString() : null} />
                <InfoRow label="Personal Email" value={employee.personalEmail} />
                <InfoRow label="Alternate Phone" value={employee.alternatePhone} />
              </CardContent>
            </Card>

            {/* Employment Info */}
            <Card className="shadow-sm border-border">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-lg">Employment Details</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 grid grid-cols-2 gap-x-4">
                <InfoRow label="Employee Code" value={employee.employeeCode} />
                <InfoRow label="Department" value={employee.department?.name} />
                <InfoRow label="Designation" value={employee.designation} />
                <InfoRow label="Employment Type" value={employee.employmentType} />
                <InfoRow label="Date of Joining" value={new Date(employee.dateOfJoining).toLocaleDateString()} />
                <InfoRow label="Reporting Manager" value={employee.manager ? `${employee.manager.firstName} ${employee.manager.lastName}` : 'None'} />
                <InfoRow label="Week Off Days" value={((employee as any).weekOffDays || ['SUNDAY']).map((d: string) => d.charAt(0) + d.slice(1).toLowerCase()).join(', ')} />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="shadow-sm border-border">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-lg">Address</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="mb-4">
                  <dt className="text-sm text-text-muted font-medium mb-1">Current Address</dt>
                  <dd className="text-sm text-text whitespace-pre-wrap">
                    {(() => {
                      try {
                        if (!employee.currentAddress) return '—';
                        const addr = JSON.parse(employee.currentAddress);
                        return [addr.houseNo, addr.building, addr.street, addr.landmark, addr.city, addr.taluka, addr.district, addr.state, addr.pinCode].filter(Boolean).join(', ');
                      } catch {
                        return employee.currentAddress || '—';
                      }
                    })()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-text-muted font-medium mb-1">Permanent Address</dt>
                  <dd className="text-sm text-text whitespace-pre-wrap">
                    {(() => {
                      try {
                        if (!employee.permanentAddress) return '—';
                        const addr = JSON.parse(employee.permanentAddress);
                        return [addr.houseNo, addr.building, addr.street, addr.landmark, addr.city, addr.taluka, addr.district, addr.state, addr.pinCode].filter(Boolean).join(', ');
                      } catch {
                        return employee.permanentAddress || '—';
                      }
                    })()}
                  </dd>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-border">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-lg">Emergency Contact</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 grid grid-cols-2 gap-x-4">
                <InfoRow label="Contact Name" value={employee.emergencyContactName} />
                <InfoRow label="Relationship" value={employee.emergencyContactRel} />
                <InfoRow label="Phone Number" value={employee.emergencyContactPhone} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="documents" className="mt-6">
          <EmployeeDocumentsTab employeeId={id!} />
        </TabsContent>

        <TabsContent value="attendance" className="mt-6">
          <EmployeeAttendanceTab employeeId={id!} />
        </TabsContent>

        <TabsContent value="leave" className="mt-6">
          <EmployeeLeaveTab employeeId={id!} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

