import type { ColumnDef } from '@tanstack/react-table';
import type { LeaveRequest } from '../api/leave-api';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { format, formatDistanceToNow } from 'date-fns';
import { Eye, XCircle } from 'lucide-react';

function StatusBadge({ status }: { status: LeaveRequest['status'] }) {
  switch (status) {
    case 'PENDING':
      return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 hover:bg-amber-500/20">Pending</Badge>;
    case 'APPROVED':
      return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20">Approved</Badge>;
    case 'REJECTED':
      return <Badge variant="destructive">Rejected</Badge>;
    case 'CANCELLED':
      return <Badge variant="secondary">Cancelled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function LeaveTypeBadge({ name }: { name: string }) {
  return (
    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
      {name}
    </Badge>
  );
}

// ── Shared column definitions ─────────────────────────────────
const leaveTypeColumn: ColumnDef<LeaveRequest> = {
  accessorKey: 'leaveType',
  header: 'Leave Type',
  cell: ({ row }) => {
    const isML = row.original.leaveType?.code === 'ML' || row.original.leaveType?.name?.toLowerCase().includes('maternity');
    return (
      <div className="flex flex-col gap-1 items-start">
        <LeaveTypeBadge name={row.original.leaveType?.name || 'N/A'} />
        {isML && row.original.childNumber && (
          <div className="text-[10px] text-text-muted leading-tight">
            Child #{row.original.childNumber} <br />
            EDD: {row.original.expectedDeliveryDate ? format(new Date(row.original.expectedDeliveryDate), 'MMM dd, yyyy') : 'N/A'}
          </div>
        )}
      </div>
    );
  },
};

const startDateColumn: ColumnDef<LeaveRequest> = {
  accessorKey: 'startDate',
  header: 'Start Date',
  cell: ({ row }) => (
    <span className="text-sm text-text">{format(new Date(row.original.startDate), 'MMM dd, yyyy')}</span>
  ),
};

const endDateColumn: ColumnDef<LeaveRequest> = {
  accessorKey: 'endDate',
  header: 'End Date',
  cell: ({ row }) => (
    <span className="text-sm text-text">{format(new Date(row.original.endDate), 'MMM dd, yyyy')}</span>
  ),
};

const totalDaysColumn: ColumnDef<LeaveRequest> = {
  accessorKey: 'totalDays',
  header: 'Days',
  cell: ({ row }) => <span className="font-semibold text-text">{row.original.totalDays}</span>,
};

const statusColumn: ColumnDef<LeaveRequest> = {
  accessorKey: 'status',
  header: 'Status',
  cell: ({ row }) => <StatusBadge status={row.original.status} />,
};

const appliedOnColumn: ColumnDef<LeaveRequest> = {
  accessorKey: 'createdAt',
  header: 'Applied On',
  cell: ({ row }) => (
    <span className="text-sm text-text-muted">
      {formatDistanceToNow(new Date(row.original.createdAt), { addSuffix: true })}
    </span>
  ),
};

// ── Employee Leave Columns (self-service view) ────────────────
export function getEmployeeLeaveColumns(onCancel: (id: string) => void): ColumnDef<LeaveRequest>[] {
  return [
    leaveTypeColumn,
    startDateColumn,
    endDateColumn,
    totalDaysColumn,
    statusColumn,
    appliedOnColumn,
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const request = row.original;
        if (request.status !== 'PENDING') return null;
        return (
          <div className="flex items-center gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onCancel(request.id)}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
        );
      },
    },
  ];
}

// ── Admin Leave Columns ───────────────────────────────────────
export function getAdminLeaveColumns(onReview: (request: LeaveRequest) => void): ColumnDef<LeaveRequest>[] {
  return [
    {
      accessorKey: 'employee',
      header: 'Employee',
      cell: ({ row }) => {
        const emp = row.original.employee;
        if (!emp) return 'N/A';
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={emp.profilePhotoUrl} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {emp.firstName.charAt(0)}{emp.lastName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-text">{emp.firstName} {emp.lastName}</p>
              <p className="text-xs text-text-muted">{emp.department?.name || 'No Dept'}</p>
            </div>
          </div>
        );
      },
    },
    leaveTypeColumn,
    startDateColumn,
    endDateColumn,
    totalDaysColumn,
    statusColumn,
    appliedOnColumn,
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const request = row.original;
        if (request.status !== 'PENDING') return null;
        return (
          <Button
            variant="outline"
            size="sm"
            className="text-primary border-primary/30 hover:bg-primary/10"
            onClick={() => onReview(request)}
          >
            <Eye className="h-4 w-4 mr-1" />
            Review
          </Button>
        );
      },
    },
  ];
}
