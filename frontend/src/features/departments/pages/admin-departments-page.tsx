import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useEmployees } from '@/features/employees/api/use-employees';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { 
  useDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment 
} from '@/features/settings/api';
import type { Department } from '@/features/settings/api';

const departmentSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  code: z.string().min(2, 'Code is required').toUpperCase(),
  codeInitial: z.string().length(1, 'Must be 1 character').toUpperCase(),
  parentId: z.string().optional().nullable(),
});

function DepartmentEmployeeList({ departmentId }: { departmentId: string }) {
  const { data, isLoading } = useEmployees({ departmentId, limit: 100 });

  if (isLoading) return <div className="p-4 text-sm text-text-muted">Loading employees...</div>;
  if (!data?.data?.length) return <div className="p-4 text-sm text-text-muted">No employees in this department.</div>;

  return (
    <div className="p-4 bg-surface/30 border-t border-border/50 divide-y divide-border/50">
      <h6 className="text-xs font-semibold text-text-muted mb-2 uppercase tracking-wider">Employees in Department</h6>
      {data.data.map(emp => (
        <div key={emp.id} className="py-2 flex items-center justify-between hover:bg-surface/50">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={emp.profilePhotoUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {emp.firstName[0]}{emp.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-text">{emp.firstName} {emp.lastName}</p>
              <p className="text-xs text-text-muted">{emp.designation}</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] uppercase">
            {emp.status}
          </Badge>
        </div>
      ))}
    </div>
  );
}

export function AdminDepartmentsPage() {
  const { data: departments, isLoading } = useDepartments();
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();
  const deleteMutation = useDeleteDepartment();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});

  const toggleDept = (id: string) => {
    setExpandedDepts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const form = useForm<z.infer<typeof departmentSchema>>({
    resolver: zodResolver(departmentSchema),
    defaultValues: { name: '', code: '', codeInitial: '', parentId: '' },
  });

  const handleEdit = (dept: Department) => {
    setEditingDept(dept);
    form.reset({
      name: dept.name,
      code: dept.code || '',
      codeInitial: dept.codeInitial || '',
      parentId: dept.parentId || '',
    });
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingDept(null);
    form.reset({ name: '', code: '', codeInitial: '', parentId: '' });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this department?')) {
      deleteMutation.mutate(id);
    }
  };

  const onSubmit = (values: z.infer<typeof departmentSchema>) => {
    const payload = { ...values, parentId: values.parentId || undefined };
    if (editingDept) {
      updateMutation.mutate(
        { id: editingDept.id, data: payload },
        {
          onSuccess: () => {
            setIsDialogOpen(false);
            setEditingDept(null);
          },
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          setIsDialogOpen(false);
          form.reset();
        },
      });
    }
  };

  // Group departments into parent/child
  const parentDepts = departments?.filter(d => !d.parentId) || [];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Departments" 
        description="Manage organizational departments and reporting structure."
        action={
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" /> Add Department
          </Button>
        }
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDept ? 'Edit Department' : 'Create Department'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Department Name</Label>
              <Input {...form.register('name')} placeholder="e.g. Sales" />
              {form.formState.errors.name && <p className="text-xs text-rose-500">{form.formState.errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input {...form.register('code')} placeholder="e.g. SLS" />
                {form.formState.errors.code && <p className="text-xs text-rose-500">{form.formState.errors.code.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Prefix Initial</Label>
                <Input {...form.register('codeInitial')} placeholder="e.g. S" maxLength={1} />
                {form.formState.errors.codeInitial && <p className="text-xs text-rose-500">{form.formState.errors.codeInitial.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Parent Department (Optional)</Label>
              <select 
                {...form.register('parentId')} 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">None (Top Level)</option>
                {parentDepts.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingDept ? 'Update' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Card className="bg-background border-border">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-text-muted">Loading departments...</div>
          ) : !departments?.length ? (
            <div className="p-8 text-center text-text-muted">No departments configured.</div>
          ) : (
            <div className="divide-y divide-border">
              {parentDepts.map((dept) => (
                <div key={dept.id}>
                  {/* Parent Row */}
                  <div className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-surface/50 bg-background transition-colors">
                    <div>
                      <h4 className="font-bold text-text text-lg">{dept.name}</h4>
                      <p className="text-xs text-text-muted">Code: {dept.code || 'N/A'} • Prefix: {dept.codeInitial} • Employees: {dept.employeeCount}</p>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <Button variant="ghost" size="sm" onClick={() => toggleDept(dept.id)} className="text-text-muted hover:text-primary flex-1 sm:flex-none justify-center">
                        <Users className="w-4 h-4 mr-2" />
                        Employees
                        {expandedDepts[dept.id] ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                      </Button>
                      <div className="flex gap-2 border-l border-border pl-3">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(dept as any)}>Edit</Button>
                        <Button variant="ghost" size="sm" className="text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(dept.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  {expandedDepts[dept.id] && <DepartmentEmployeeList departmentId={dept.id} />}
                  
                  {/* Child Rows */}
                  {dept.children && dept.children.length > 0 && (
                    <div className="bg-surface/30 pl-8 divide-y divide-border/50 border-t border-border/50">
                      {dept.children.map(child => (
                        <div key={child.id} className="flex flex-col">
                          <div className="p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-surface/80 transition-colors">
                             <div className="flex items-center gap-2">
                               <div className="w-4 h-px bg-border hidden sm:block"></div>
                               <div>
                                 <h5 className="font-medium text-text text-sm">{child.name}</h5>
                                 <p className="text-xs text-text-muted">Code: {child.code || 'N/A'} • Prefix: {child.codeInitial}</p>
                               </div>
                             </div>
                             <div className="flex items-center gap-2 w-full sm:w-auto">
                               <Button variant="ghost" size="sm" onClick={() => toggleDept(child.id)} className="h-8 px-2 text-xs text-text-muted hover:text-primary flex-1 sm:flex-none justify-center">
                                 <Users className="w-3 h-3 mr-1" />
                                 Employees
                                 {expandedDepts[child.id] ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                               </Button>
                               <div className="flex gap-1 border-l border-border pl-2">
                                 <Button variant="ghost" size="sm" className="text-xs h-8 px-2" onClick={() => handleEdit(child as any)}>Edit</Button>
                                 <Button variant="ghost" size="sm" className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 h-8 px-2" onClick={() => handleDelete(child.id)}>
                                   <Trash2 className="w-3 h-3" />
                                 </Button>
                               </div>
                             </div>
                          </div>
                          {expandedDepts[child.id] && <DepartmentEmployeeList departmentId={child.id} />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
