import type { ColumnDef } from '@tanstack/react-table';
import type { AttendanceRecord } from '../api/attendance-api';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { MapPin, Monitor, Camera } from 'lucide-react';

export const attendanceColumns: ColumnDef<AttendanceRecord>[] = [
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
  {
    id: 'empCode',
    header: 'Emp Code',
    cell: ({ row }) => <span className="text-sm font-mono text-text-muted">{row.original.employee?.employeeCode}</span>,
  },
  {
    accessorKey: 'date',
    header: 'Date',
    cell: ({ row }) => format(new Date(row.original.date), 'MMM dd, yyyy'),
  },
  {
    accessorKey: 'punchInTime',
    header: 'Punch In',
    cell: ({ row }) => row.original.punchInTime ? format(new Date(row.original.punchInTime), 'hh:mm a') : '--:--',
  },
  {
    accessorKey: 'punchOutTime',
    header: 'Punch Out',
    cell: ({ row }) => row.original.punchOutTime ? format(new Date(row.original.punchOutTime), 'hh:mm a') : '--:--',
  },
  {
    accessorKey: 'workHours',
    header: 'Hours',
    cell: ({ row }) => row.original.workHours ? <span className="font-medium">{row.original.workHours.toFixed(2)}h</span> : '--',
  },
  {
    accessorKey: 'source',
    header: 'Source',
    cell: ({ row }) => {
      const src = row.original.source;
      if (src === 'GPS_VERIFIED') return <Badge variant="outline" className="text-info border-info/30 bg-info/5"><MapPin className="w-3 h-3 mr-1"/> GPS</Badge>;
      return <Badge variant="outline" className="text-text-muted"><Monitor className="w-3 h-3 mr-1"/> Web</Badge>;
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status;
      switch (status) {
        case 'PRESENT': return <Badge variant="success">Present</Badge>;
        case 'ABSENT': return <Badge variant="destructive">Absent</Badge>;
        case 'LATE': return <Badge className="bg-warning text-white hover:bg-warning/80">Late</Badge>;
        case 'HALF_DAY': return <Badge className="bg-warning text-white hover:bg-warning/80">Half Day</Badge>;
        case 'WFH': return <Badge className="bg-info text-white hover:bg-info/80">WFH</Badge>;
        case 'ON_LEAVE': return <Badge className="bg-purple-500 text-white hover:bg-purple-600">On Leave</Badge>;
        default: return <Badge variant="secondary">{status}</Badge>;
      }
    },
  },
  {
    id: 'photos',
    header: 'Photos',
    cell: ({ row }) => {
      const { punchInPhotoUrl, punchOutPhotoUrl } = row.original;
      if (!punchInPhotoUrl && !punchOutPhotoUrl) return <span className="text-xs text-text-muted">None</span>;
      return (
        <div className="flex gap-2">
          {punchInPhotoUrl && (
            <a href={punchInPhotoUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
              <Camera className="w-3 h-3" /> In
            </a>
          )}
          {punchOutPhotoUrl && (
            <a href={punchOutPhotoUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
              <Camera className="w-3 h-3" /> Out
            </a>
          )}
        </div>
      );
    }
  },
];
