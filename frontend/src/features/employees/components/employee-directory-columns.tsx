import type { ColumnDef } from '@tanstack/react-table';
import type { Employee } from '../api/employee-api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Building2, Eye } from 'lucide-react';

export const employeeDirectoryColumns: ColumnDef<Employee>[] = [
  {
    accessorKey: 'employeeCode',
    header: 'Employee ID',
    cell: ({ row }) => (
      <span className="font-mono text-xs text-text-muted">{row.original.employeeCode || '-'}</span>
    ),
  },
  {
    accessorKey: 'firstName',
    header: 'Employee',
    cell: ({ row }) => {
      const employee = row.original;
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={employee.profilePhotoUrl || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {employee.firstName[0]}
              {employee.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium text-text">
              {employee.firstName} {employee.lastName}
            </span>
            <span className="text-xs text-text-muted">{employee.designation}</span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'department.name',
    header: 'Department',
    cell: ({ row }) => {
      const deptName = row.original.department?.name;
      if (!deptName) return <span className="text-text-muted">-</span>;
      return (
        <div className="flex items-center text-sm text-text">
          <Building2 className="w-4 h-4 mr-2 text-text-muted" />
          {deptName}
        </div>
      );
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const employee = row.original;
      return (
        <div className="flex justify-end">
          <Link to={`/employee/employees/${employee.id}`}>
            <Button variant="ghost" size="sm" className="h-8 text-primary hover:text-primary-dark">
              <Eye className="w-4 h-4 mr-2" /> View Profile
            </Button>
          </Link>
        </div>
      );
    },
  },
];
