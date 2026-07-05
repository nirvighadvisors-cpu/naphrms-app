import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { employeeDirectoryColumns } from '../components/employee-directory-columns';
import { useEmployeeDirectory } from '../api/use-employees';
import { Users } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

export const EmployeeDirectoryPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [departmentId, setDepartmentId] = useState<string>('all');
  
  const { data: employeeData, isLoading } = useEmployeeDirectory({
    page,
    limit: 20,
    ...(departmentId !== 'all' ? { departmentId } : {}),
  });

  return (
    <div className="space-y-4 sm:space-y-6 h-full flex flex-col">
      <PageHeader 
        title="Company Directory" 
        description="View your colleagues and team members across the organization."
        breadcrumbs={[
          { label: 'Dashboard', href: '/employee/dashboard' },
          { label: 'Directory' }
        ]}
      />

      <div className="flex-1 min-h-[300px] sm:min-h-[400px] bg-surface rounded-xl border border-border overflow-hidden shadow-sm flex flex-col">
        {!isLoading && (!employeeData?.data || employeeData.data.length === 0) ? (
          <EmptyState 
            icon={<Users className="w-8 h-8" />}
            title="No employees found" 
            description="Try adjusting your search to see more results."
          />
        ) : (
          <DataTable 
            columns={employeeDirectoryColumns} 
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
