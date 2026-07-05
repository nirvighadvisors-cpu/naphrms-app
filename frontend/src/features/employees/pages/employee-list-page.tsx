import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { employeeColumns } from '../components/employee-columns';
import { useEmployees } from '../api/use-employees';
import { useDepartments } from '../api/use-departments';
import { Button } from '@/components/ui/button';
import { Plus, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/ui/empty-state';

export const EmployeeListPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [departmentId, setDepartmentId] = useState<string>('all');
  const [status, setStatus] = useState<string>('ACTIVE');
  

  const { data: employeeData, isLoading } = useEmployees({
    page,
    limit: 20,
    ...(departmentId !== 'all' ? { departmentId } : {}),
    ...(status !== 'all' ? { status } : {}),
  });



  const handleStatusChange = (val: string) => {
    setStatus(val);
    setPage(1);
  };

  return (
    <div className="space-y-4 sm:space-y-6 h-full flex flex-col">
      <PageHeader 
        title="Employees" 
        description="Manage your team members and their information."
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin/dashboard' },
          { label: 'Employees' }
        ]}
        action={
          <Link to="/admin/employees/new">
            <Button className="h-10">
              <Plus className="mr-2 h-4 w-4" /> Add Employee
            </Button>
          </Link>
        }
      />



      <div className="border-b border-border -mx-3 sm:mx-0 px-3 sm:px-0">
        <div className="flex gap-4 sm:gap-6 overflow-x-auto scrollbar-none">
          {[
            { id: 'all', label: 'All Employees' },
            { id: 'ACTIVE', label: 'Active' },
            { id: 'PENDING_REGISTRATION', label: 'Pending' },
            { id: 'INACTIVE', label: 'Inactive' },
            { id: 'TERMINATED', label: 'Terminated' },
            { id: 'ON_LEAVE', label: 'On Leave' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => handleStatusChange(tab.id)}
              className={`pb-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                status === tab.id 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-text-muted hover:text-text hover:border-border'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-[300px] sm:min-h-[400px] bg-surface rounded-xl border border-border overflow-hidden shadow-sm flex flex-col">
        {!isLoading && (!employeeData?.data || employeeData.data.length === 0) && (status !== 'all' || departmentId !== 'all') ? (
          <EmptyState 
            icon={<Users className="w-8 h-8" />}
            title="No employees found" 
            description="Try adjusting your filters to see more results."
            action={<Button variant="outline" onClick={() => { setStatus('all'); setDepartmentId('all'); }}>Clear Filters</Button>}
          />
        ) : (
          <DataTable 
            columns={employeeColumns} 
            data={employeeData?.data || []}
            searchKey="firstName"
            searchPlaceholder="Search by name..."
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
};
