import type { ColumnDef } from '@tanstack/react-table';
import type { Employee } from '../api/employee-api';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  ACTIVE: { label: 'Active', variant: 'default' },
  INACTIVE: { label: 'Inactive', variant: 'destructive' },
  TERMINATED: { label: 'Terminated', variant: 'destructive' },
  ON_LEAVE: { label: 'On Leave', variant: 'outline' },
  PENDING_REGISTRATION: { label: 'Pending', variant: 'outline' },
};

const employmentTypeLabels: Record<string, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACTOR: 'Contractor',
  INTERN: 'Intern',
};

export const employeeColumns: ColumnDef<Employee, unknown>[] = [
  {
    accessorKey: 'firstName',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="-ml-3 h-8">
        Employee
        <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
      </Button>
    ),
    cell: ({ row }) => {
      const emp = row.original;
      const initials = `${emp.firstName[0]}${emp.lastName[0]}`;
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-border">
            <AvatarImage src={emp.profilePhotoUrl || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-text leading-none">{emp.firstName} {emp.lastName}</p>
            <p className="text-xs text-text-muted mt-0.5">{emp.employeeCode || 'Pending Registration'}</p>
          </div>
        </div>
      );
    },
  },
  {
    id: 'email',
    header: 'Email',
    cell: ({ row }) => (
      <span className="text-text-muted text-sm">{row.original.user?.email || '—'}</span>
    ),
  },
  {
    id: 'department',
    header: 'Department',
    cell: ({ row }) => (
      <span className="text-sm">{row.original.department?.name || '—'}</span>
    ),
    filterFn: (row, _id, filterValue) => {
      return row.original.departmentId === filterValue;
    },
  },
  {
    accessorKey: 'designation',
    header: 'Designation',
    cell: ({ row }) => (
      <span className="text-sm text-text-muted">{row.original.designation}</span>
    ),
  },
  {
    accessorKey: 'employmentType',
    header: 'Type',
    cell: ({ row }) => (
      <span className="text-sm text-text-muted">
        {employmentTypeLabels[row.original.employmentType] || row.original.employmentType}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const config = statusConfig[row.original.status] || { label: row.original.status, variant: 'outline' as const };
      return <Badge variant={config.variant}>{config.label}</Badge>;
    },
  },
  {
    accessorKey: 'dateOfJoining',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="-ml-3 h-8">
        Joined
        <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
      </Button>
    ),
    cell: ({ row }) => {
      const date = new Date(row.original.dateOfJoining);
      return <span className="text-sm text-text-muted">{date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>;
    },
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const handleResend = async () => {
        try {
          const { apiClient } = await import('@/lib/api-client');
          const { toast } = await import('@/hooks/use-toast');
          await apiClient.post(`/employees/${row.original.id}/resend-invite`);
          toast({ title: 'Success', description: 'Invitation resent successfully' });
        } catch (error) {
          const { toast } = await import('@/hooks/use-toast');
          toast({ title: 'Error', description: 'Failed to resend invitation', variant: 'destructive' });
        }
      };

      return (
        <div className="flex justify-end gap-2">
          {row.original.status === 'PENDING_REGISTRATION' && (
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleResend}>
              Resend Invite
            </Button>
          )}
          <Link to={`/admin/employees/${row.original.id}`}>
            <Button variant="ghost" size="sm" className="h-8 text-text-muted hover:text-primary">
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
          </Link>
        </div>
      );
    },
  },
];
