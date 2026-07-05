import React, { useState, useMemo } from 'react';
import type { LeaveRequest, LeaveType as LeaveTypeModel } from '../api/leave-api';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { StatsCard } from '@/components/ui/stats-card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useAllLeaveRequests,
  useLeaveTypes,
  useAllBalances,
  useLeaveSummary,
  useReviewLeave,
  useCreateLeaveType,
  useUpdateLeaveType,
  useDeleteLeaveType,
  useInitializeBalances,
} from '../api/use-leave';
import { useEmployees } from '@/features/employees/api/use-employees';
import { getAdminLeaveColumns } from '../components/leave-columns';
import {
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Settings,
  CalendarDays,
  Loader2,
  Edit,
  Trash2,
  RefreshCw,
  BarChart3,
} from 'lucide-react';
import { format } from 'date-fns';

// ── Review Dialog ─────────────────────────────────────────────
function ReviewDialog({
  request,
  open,
  onOpenChange,
}: {
  request: LeaveRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [remarks, setRemarks] = useState('');
  const reviewMutation = useReviewLeave();

  const handleReview = (status: string) => {
    if (!request) return;
    reviewMutation.mutate(
      { id: request.id, data: { status, remarks: remarks.trim() || undefined } },
      {
        onSuccess: () => {
          setRemarks('');
          onOpenChange(false);
        },
      }
    );
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Review Leave Request</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Employee Info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-offset/50 border border-border">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
              {request.employee?.firstName?.charAt(0)}{request.employee?.lastName?.charAt(0)}
            </div>
            <div>
              <p className="font-medium text-text">
                {request.employee?.firstName} {request.employee?.lastName}
              </p>
              <p className="text-xs text-text-muted">
                {request.employee?.employeeCode} · {request.employee?.department?.name || 'No Dept'}
              </p>
            </div>
          </div>

          {/* Leave Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-text-muted font-medium">Leave Type</p>
              <p className="text-sm font-semibold text-text">{request.leaveType?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted font-medium">Total Days</p>
              <p className="text-sm font-semibold text-text">{request.totalDays}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted font-medium">Start Date</p>
              <p className="text-sm text-text">{format(new Date(request.startDate), 'MMM dd, yyyy')}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted font-medium">End Date</p>
              <p className="text-sm text-text">{format(new Date(request.endDate), 'MMM dd, yyyy')}</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-text-muted font-medium mb-1">Reason</p>
            <p className="text-sm text-text bg-surface-offset/50 p-3 rounded-lg border border-border">{request.reason}</p>
          </div>

          {request.attachment && (
            <div>
              <p className="text-xs text-text-muted font-medium mb-1">Attachment</p>
              <a href={request.attachment} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">
                View Attachment
              </a>
            </div>
          )}

          {/* Remarks */}
          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks (optional)</Label>
            <Textarea
              id="remarks"
              placeholder="Add any remarks or notes..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="destructive"
            onClick={() => handleReview('REJECTED')}
            disabled={reviewMutation.isPending}
          >
            {reviewMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <XCircle className="h-4 w-4 mr-1" />
            Reject
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => handleReview('APPROVED')}
            disabled={reviewMutation.isPending}
          >
            {reviewMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <CheckCircle className="h-4 w-4 mr-1" />
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Leave Type Form Dialog ────────────────────────────────────
function LeaveTypeFormDialog({
  open,
  onOpenChange,
  editingType,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingType: LeaveTypeModel | null;
}) {
  const [name, setName] = useState(editingType?.name || '');
  const [code, setCode] = useState(editingType?.code || '');
  const [description, setDescription] = useState(editingType?.description || '');
  const [maxDaysPerYear, setMaxDaysPerYear] = useState(editingType?.maxDaysPerYear?.toString() || '12');
  const [isPaid, setIsPaid] = useState(editingType?.isPaid ?? true);
  const [carryForward, setCarryForward] = useState(editingType?.carryForward ?? false);
  const [maxCarryForward, setMaxCarryForward] = useState(editingType?.maxCarryForward?.toString() || '');
  const [requiresDoc, setRequiresDoc] = useState(editingType?.requiresDoc ?? false);
  const [noticeDays, setNoticeDays] = useState(editingType?.noticeDays?.toString() || '0');

  const createMutation = useCreateLeaveType();
  const updateMutation = useUpdateLeaveType();

  // Reset form when editingType changes
  React.useEffect(() => {
    setName(editingType?.name || '');
    setCode(editingType?.code || '');
    setDescription(editingType?.description || '');
    setMaxDaysPerYear(editingType?.maxDaysPerYear?.toString() || '12');
    setIsPaid(editingType?.isPaid ?? true);
    setCarryForward(editingType?.carryForward ?? false);
    setMaxCarryForward(editingType?.maxCarryForward?.toString() || '');
    setRequiresDoc(editingType?.requiresDoc ?? false);
    setNoticeDays(editingType?.noticeDays?.toString() || '0');
  }, [editingType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name,
      code: code.toUpperCase(),
      description: description || null,
      maxDaysPerYear: parseInt(maxDaysPerYear) || 0,
      isPaid,
      carryForward,
      maxCarryForward: carryForward && maxCarryForward ? parseInt(maxCarryForward) : null,
      requiresDoc,
      noticeDays: parseInt(noticeDays) || 0,
    };

    const onSuccess = () => onOpenChange(false);

    if (editingType) {
      updateMutation.mutate({ id: editingType.id, data: payload }, { onSuccess });
    } else {
      createMutation.mutate(payload, { onSuccess });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editingType ? 'Edit Leave Type' : 'Create Leave Type'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lt-name">Name</Label>
              <Input id="lt-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Casual Leave" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lt-code">Code</Label>
              <Input id="lt-code" value={code} onChange={(e) => setCode(e.target.value)} required placeholder="CL" className="uppercase" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lt-desc">Description</Label>
            <Input id="lt-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lt-max">Max Days/Year</Label>
              <Input id="lt-max" type="number" min="0" value={maxDaysPerYear} onChange={(e) => setMaxDaysPerYear(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lt-notice">Notice Days</Label>
              <Input id="lt-notice" type="number" min="0" value={noticeDays} onChange={(e) => setNoticeDays(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} className="rounded border-border" />
              Paid Leave
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={carryForward} onChange={(e) => setCarryForward(e.target.checked)} className="rounded border-border" />
              Carry Forward
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={requiresDoc} onChange={(e) => setRequiresDoc(e.target.checked)} className="rounded border-border" />
              Requires Document
            </label>
          </div>

          {carryForward && (
            <div className="space-y-2">
              <Label htmlFor="lt-maxcf">Max Carry Forward Days</Label>
              <Input id="lt-maxcf" type="number" min="0" value={maxCarryForward} onChange={(e) => setMaxCarryForward(e.target.value)} placeholder="Leave blank for unlimited" />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingType ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Admin Leave Page ──────────────────────────────────────────
export function AdminLeavePage() {
  const [activeTab, setActiveTab] = useState('requests');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [balanceYear, setBalanceYear] = useState(new Date().getFullYear());
  const [balanceEmployeeId, setBalanceEmployeeId] = useState<string>('all');
  // Review dialog state
  const [reviewRequest, setReviewRequest] = useState<LeaveRequest | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  // Leave type form state
  const [typeFormOpen, setTypeFormOpen] = useState(false);
  const [editingType, setEditingType] = useState<LeaveTypeModel | null>(null);

  // Queries
  const { data: employeesData } = useEmployees({ limit: 1000 });
  const { data: summary, isLoading: isLoadingSummary } = useLeaveSummary();
  const { data: requestsData, isLoading: isLoadingRequests } = useAllLeaveRequests({
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    page,
    limit: 20,
  });
  const { data: leaveTypes, isLoading: isLoadingTypes } = useLeaveTypes();
  const { data: balancesData, isLoading: isLoadingBalances } = useAllBalances({ 
    year: balanceYear,
    employeeId: balanceEmployeeId === 'all' ? undefined : balanceEmployeeId
  });

  // Mutations
  const deleteTypeMutation = useDeleteLeaveType();
  const initBalancesMutation = useInitializeBalances();

  const handleReview = (request: LeaveRequest) => {
    setReviewRequest(request);
    setReviewOpen(true);
  };

  const handleEditType = (lt: LeaveTypeModel) => {
    setEditingType(lt);
    setTypeFormOpen(true);
  };

  const handleCreateType = () => {
    setEditingType(null);
    setTypeFormOpen(true);
  };

  const handleDeleteType = (id: string) => {
    deleteTypeMutation.mutate(id);
  };

  const handleInitializeBalances = () => {
    initBalancesMutation.mutate({ year: balanceYear });
  };

  const adminColumns = useMemo(() => getAdminLeaveColumns(handleReview), []);

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className="space-y-6 h-full flex flex-col">
      <PageHeader
        title="Leave Management"
        description="Manage leave requests, configure leave types, and track employee balances."
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isLoadingSummary ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          <>
            <StatsCard
              title="Pending Requests"
              value={summary?.pendingCount || 0}
              icon={<Clock className="h-5 w-5 text-amber-500" />}
            />
            <StatsCard
              title="Approved This Month"
              value={summary?.approvedThisMonth || 0}
              icon={<CheckCircle className="h-5 w-5 text-emerald-500" />}
            />
            <StatsCard
              title="Rejected This Month"
              value={summary?.rejectedThisMonth || 0}
              icon={<XCircle className="h-5 w-5 text-red-500" />}
            />
          </>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-fit bg-surface border border-border">
          <TabsTrigger value="requests">
            Requests
            {summary?.pendingCount ? (
              <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                {summary.pendingCount}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="types">Leave Types</TabsTrigger>
          <TabsTrigger value="balances">Balances</TabsTrigger>
        </TabsList>

        {/* ── Requests Tab ───────────────────────────────────── */}
        <TabsContent value="requests" className="space-y-4 mt-6 flex-1 flex flex-col focus-visible:outline-none focus-visible:ring-0">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 items-center bg-surface p-4 rounded-xl border border-border shadow-sm">
            <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[180px] bg-bg h-9">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="flex-1 min-h-[400px] bg-surface rounded-xl border border-border overflow-hidden shadow-sm flex flex-col">
            <DataTable
              columns={adminColumns}
              data={requestsData?.data || []}
              isLoading={isLoadingRequests}
              emptyStateTitle="No leave requests"
              emptyStateDescription="There are no leave requests matching the current filters."
            />
          </div>
        </TabsContent>

        {/* ── Leave Types Tab ────────────────────────────────── */}
        <TabsContent value="types" className="mt-6 flex-1 focus-visible:outline-none focus-visible:ring-0">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Leave Types Configuration
              </CardTitle>
              <Button size="sm" onClick={handleCreateType}>
                <Plus className="h-4 w-4 mr-1" />
                Add Type
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingTypes ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
                </div>
              ) : !leaveTypes?.length ? (
                <EmptyState
                  icon={<CalendarDays className="h-8 w-8" />}
                  title="No leave types configured"
                  description='Click "Add Type" to create your first leave type.'
                  className="min-h-[200px]"
                />
              ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-surface-offset/50">
                      <TableRow>
                        <TableHead className="font-semibold text-text">Name</TableHead>
                        <TableHead className="font-semibold text-text">Code</TableHead>
                        <TableHead className="font-semibold text-text">Max Days</TableHead>
                        <TableHead className="font-semibold text-text">Paid</TableHead>
                        <TableHead className="font-semibold text-text">Carry Forward</TableHead>
                        <TableHead className="font-semibold text-text">Requires Doc</TableHead>
                        <TableHead className="font-semibold text-text">Notice Days</TableHead>
                        <TableHead className="font-semibold text-text text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaveTypes.map((lt) => (
                        <TableRow key={lt.id} className="hover:bg-surface-offset/50 transition-colors">
                          <TableCell>
                            <div>
                              <p className="font-medium text-text">{lt.name}</p>
                              {lt.description && <p className="text-xs text-text-muted">{lt.description}</p>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">{lt.code}</Badge>
                          </TableCell>
                          <TableCell className="font-semibold">{lt.maxDaysPerYear}</TableCell>
                          <TableCell>
                            <Badge className={lt.isPaid ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' : 'bg-gray-500/15 text-gray-500 border-gray-500/30'}>
                              {lt.isPaid ? 'Yes' : 'No'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {lt.carryForward ? (
                              <span className="text-sm text-text">Yes{lt.maxCarryForward ? ` (max ${lt.maxCarryForward})` : ''}</span>
                            ) : (
                              <span className="text-sm text-text-muted">No</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-text-muted">{lt.requiresDoc ? 'Yes' : 'No'}</span>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{lt.noticeDays}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleEditType(lt)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteType(lt.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Balances Tab ───────────────────────────────────── */}
        <TabsContent value="balances" className="mt-6 flex-1 focus-visible:outline-none focus-visible:ring-0">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Employee Leave Balances
              </CardTitle>
              <div className="flex items-center gap-3">
                <Select value={balanceEmployeeId} onValueChange={setBalanceEmployeeId}>
                  <SelectTrigger className="w-[220px] bg-bg h-9">
                    <SelectValue placeholder="All Employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {employeesData?.data?.map((emp: any) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.employeeCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={balanceYear.toString()} onValueChange={(val) => setBalanceYear(parseInt(val))}>
                  <SelectTrigger className="w-[120px] bg-bg h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((y) => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleInitializeBalances}
                  disabled={initBalancesMutation.isPending}
                >
                  {initBalancesMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-1" />
                  )}
                  Initialize {balanceYear}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingBalances ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
                </div>
              ) : !balancesData?.data?.length ? (
                <EmptyState
                  icon={<BarChart3 className="h-8 w-8" />}
                  title="No balances found"
                  description={`No leave balances have been initialized for ${balanceYear}. Click "Initialize ${balanceYear}" to set them up.`}
                  className="min-h-[200px]"
                />
              ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-surface-offset/50">
                      <TableRow>
                        <TableHead className="font-semibold text-text">Employee</TableHead>
                        <TableHead className="font-semibold text-text">Leave Type</TableHead>
                        <TableHead className="font-semibold text-text text-center">Total</TableHead>
                        <TableHead className="font-semibold text-text text-center">Used</TableHead>
                        <TableHead className="font-semibold text-text text-center">Pending</TableHead>
                        <TableHead className="font-semibold text-text text-center">Remaining</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {balancesData.data.map((bal) => {
                        const remaining = bal.remainingDays;
                        const total = bal.totalDays;
                        const ratio = total > 0 ? remaining / total : 0;
                        const colorClass = ratio > 0.5 ? 'text-emerald-600' : ratio > 0.25 ? 'text-amber-600' : 'text-red-600';

                        return (
                          <TableRow key={bal.id} className="hover:bg-surface-offset/50 transition-colors">
                            <TableCell>
                              <div>
                                <p className="font-medium text-text">
                                  {bal.employee?.firstName} {bal.employee?.lastName}
                                </p>
                                <p className="text-xs text-text-muted">
                                  {bal.employee?.employeeCode} · {bal.employee?.department?.name || 'No Dept'}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                                {bal.leaveType.name}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center font-semibold">{bal.totalDays}</TableCell>
                            <TableCell className="text-center">{bal.usedDays}</TableCell>
                            <TableCell className="text-center text-amber-600">{bal.pendingDays}</TableCell>
                            <TableCell className={`text-center font-semibold ${colorClass}`}>
                              {bal.remainingDays}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <ReviewDialog request={reviewRequest} open={reviewOpen} onOpenChange={setReviewOpen} />

      {/* Leave Type Form Dialog */}
      <LeaveTypeFormDialog open={typeFormOpen} onOpenChange={setTypeFormOpen} editingType={editingType} />
    </div>
  );
}
