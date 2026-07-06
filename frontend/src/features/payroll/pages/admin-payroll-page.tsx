import React, { useState, useMemo } from 'react';
import type { SalaryComponent as SalaryComponentType, PayrollRun } from '../api/payroll-api';
import { PageHeader } from '@/components/ui/page-header';
import { StatsCard } from '@/components/ui/stats-card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useStructures,
  useStructure,
  usePayrollRuns,
  usePayrollRun,
  useCreateStructure,
  useDeleteStructure,
  useAddComponent,
  useUpdateComponent,
  useDeleteComponent,
  useAssignStructure,
  useGeneratePayroll,
  useLockPayroll,
  useDeletePayrollRun,
} from '../api/use-payroll';
import { SalaryPreview } from '../components/salary-preview';

import { useSettings } from '../../settings/api';
import { generatePayslipPdf } from '../utils/generate-payslip-pdf';
import { useEmployees } from '@/features/employees/api/use-employees';
import {
  IndianRupee,
  Plus,
  Trash2,
  Edit,
  Lock,
  Eye,
  Users,
  FileText,
  ChevronDown,
  ChevronRight,
  Calculator,
  Layers,
  Download,
  TrendingUp,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import { format } from 'date-fns';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const formatCurrency = (value: number): string => {
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

const getStatusBadge = (status: PayrollRun['status']) => {
  const config: Record<string, { className: string; label: string; icon?: React.ReactNode }> = {
    DRAFT: { className: 'bg-amber-500/15 text-amber-600 border-amber-500/30', label: 'Draft' },
    PROCESSING: { className: 'bg-blue-500/15 text-blue-600 border-blue-500/30', label: 'Processing' },
    COMPLETED: { className: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30', label: 'Completed' },
    LOCKED: { className: 'bg-slate-500/15 text-slate-600 border-slate-500/30', label: 'Locked', icon: <Lock className="h-3 w-3 mr-1" /> },
  };
  const c = config[status] || config.DRAFT;
  return (
    <Badge className={`${c.className} flex items-center gap-0`}>
      {c.icon}
      {c.label}
    </Badge>
  );
};

// ── Create Structure Dialog ──────────────────────────────────
function CreateStructureDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState('');
  const createMutation = useCreateStructure();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate(
      { name: name.trim() },
      {
        onSuccess: () => {
          setName('');
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Create Salary Structure</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="struct-name">Structure Name</Label>
            <Input
              id="struct-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g., Standard Package, Executive Package"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Assign Employee Modal ──────────────────────────────────────
function AssignEmployeeModal({
  structureId,
  open,
  onOpenChange,
  onSuccess,
}: {
  structureId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (basicSalary: number) => void;
}) {
  const [employeeId, setEmployeeId] = useState('');
  const [basicSalary, setBasicSalary] = useState('');
  const assignMutation = useAssignStructure();
  const { data: employeesData } = useEmployees({ limit: 200, status: 'ACTIVE' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !basicSalary || !structureId) return;
    
    assignMutation.mutate(
      { structureId, employeeId, basicSalary: parseFloat(basicSalary) },
      {
        onSuccess: () => {
          onSuccess(parseFloat(basicSalary));
          setEmployeeId('');
          setBasicSalary('');
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Assign & Configure Structure</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="employee-select">Employee</Label>
            <Select value={employeeId} onValueChange={setEmployeeId} required>
              <SelectTrigger id="employee-select"><SelectValue placeholder="Select an employee" /></SelectTrigger>
              <SelectContent>
                {employeesData?.data?.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.employeeCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="basic-pay">Basic Pay (₹)</Label>
            <Input
              id="basic-pay"
              type="number"
              min="0"
              step="0.01"
              value={basicSalary}
              onChange={(e) => setBasicSalary(e.target.value)}
              required
              placeholder="e.g. 50000"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={assignMutation.isPending}>
              {assignMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Proceed to Configuration
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Structure Detail Sheet ───────────────────────────────────
function StructureDetailSheet({
  structureId,
  basicSalary,
  open,
  onOpenChange,
}: {
  structureId: string | null;
  basicSalary: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: structure, isLoading } = useStructure(structureId || '');


  // Add component form
  const [compName, setCompName] = useState('');
  const [compCode, setCompCode] = useState('');
  const [compCategory, setCompCategory] = useState<string>('EARNING');
  const [compCalcType, setCompCalcType] = useState<string>('FIXED');
  const [compValue, setCompValue] = useState('');
  const [compFormula, setCompFormula] = useState('');
  const [compOrder, setCompOrder] = useState('');

  // Edit component
  const [editingComp, setEditingComp] = useState<SalaryComponentType | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editCalcType, setEditCalcType] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editFormula, setEditFormula] = useState('');
  const [editOrder, setEditOrder] = useState('');

  const addMutation = useAddComponent();
  const updateMutation = useUpdateComponent();
  const deleteMutation = useDeleteComponent();

  // Drag and Drop
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const handleAddComponent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!structureId || !compName.trim()) return;
    
    // Auto-determine type based on category
    const type = (compCategory === 'EARNING' || compCategory === 'REIMBURSEMENT' || compCategory === 'BONUS') 
      ? 'EARNING' : 'DEDUCTION';

    addMutation.mutate(
      {
        structureId,
        data: {
          name: compName.trim(),
          code: compCode.trim() || undefined,
          type,
          category: compCategory as any,
          calculationType: compCalcType as any,
          value: parseFloat(compValue) || 0,
          formula: compFormula.trim() || undefined,
          order: parseInt(compOrder) || 0,
        },
      },
      {
        onSuccess: () => {
          setCompName('');
          setCompCode('');
          setCompCategory('EARNING');
          setCompCalcType('FIXED');
          setCompValue('');
          setCompFormula('');
          setCompOrder('');
        },
      }
    );
  };

  const handleStartEdit = (comp: SalaryComponentType) => {
    setEditingComp(comp);
    setEditName(comp.name);
    setEditCode(comp.code || '');
    setEditCategory(comp.category);
    setEditCalcType(comp.calculationType);
    setEditValue(comp.value.toString());
    setEditFormula(comp.formula || '');
    setEditOrder(comp.order.toString());
  };

  const handleSaveEdit = () => {
    if (!structureId || !editingComp) return;
    const type = (editCategory === 'EARNING' || editCategory === 'REIMBURSEMENT' || editCategory === 'BONUS') 
      ? 'EARNING' : 'DEDUCTION';

    updateMutation.mutate(
      {
        structureId,
        componentId: editingComp.id,
        data: {
          name: editName.trim(),
          code: editCode.trim() || undefined,
          type,
          category: editCategory as any,
          calculationType: editCalcType as any,
          value: parseFloat(editValue) || 0,
          formula: editFormula.trim() || undefined,
          order: parseInt(editOrder) || 0,
        },
      },
      { onSuccess: () => setEditingComp(null) }
    );
  };

  const handleDeleteComponent = (componentId: string) => {
    if (!structureId) return;
    deleteMutation.mutate({ structureId, componentId });
  };



  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!structureId || !draggedId || draggedId === targetId || !structure) return;
    
    const dragged = structure.components.find((c) => c.id === draggedId);
    const target = structure.components.find((c) => c.id === targetId);
    if (!dragged || !target) return;

    // Swap orders
    updateMutation.mutate({ structureId, componentId: dragged.id, data: { order: target.order } });
    updateMutation.mutate({ structureId, componentId: target.id, data: { order: dragged.order } });
    setDraggedId(null);
  };

  const formatCompValue = (comp: SalaryComponentType) => {
    if (comp.calculationType === 'FIXED') return formatCurrency(comp.value);
    if (comp.calculationType === 'FORMULA') return comp.formula || '-';
    if (comp.calculationType === 'SLAB_BASED') return 'Slab';
    return `${comp.value}%`;
  };

  const calcTypeLabel = (ct: string) => {
    const map: Record<string, string> = {
      FIXED: 'Fixed Amount',
      PERCENTAGE_OF_BASIC: '% of Basic',
      PERCENTAGE_OF_GROSS: '% of Gross',
      PERCENTAGE_OF_CTC: '% of CTC',
      FORMULA: 'Formula',
      SLAB_BASED: 'Slab Based',
    };
    return map[ct] || ct;
  };

  const sortedComponents = useMemo(() => {
    if (!structure?.components) return [];
    return [...structure.components].sort((a, b) => a.order - b.order);
  }, [structure?.components]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[1000px] w-[90vw] overflow-y-auto">
        <SheetHeader className="mb-6 pr-6">
          <SheetTitle className="flex items-center gap-2 text-text">
            <Layers className="h-5 w-5 text-primary" />
            {structure?.name || 'Loading...'}
          </SheetTitle>
          {structure && (
            <p className="text-sm text-text-muted">
              {structure.components.length} component{structure.components.length !== 1 ? 's' : ''} ·
              {' '}{structure._count?.employees || 0} employee{(structure._count?.employees || 0) !== 1 ? 's' : ''} assigned
            </p>
          )}
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
          </div>
        ) : structure ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
            <div className="space-y-6 min-w-0">
              {/* Components Table */}
              <div>
                <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
                <Calculator className="h-4 w-4 text-primary" />
                Salary Components
              </h3>
              {sortedComponents.length === 0 ? (
                <div className="text-center py-8 text-text-muted text-sm bg-surface-offset/50 rounded-lg border border-border">
                  No components yet. Add one below.
                </div>
              ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-surface-offset/50">
                      <TableRow>
                        <TableHead className="font-semibold text-text text-xs">Name</TableHead>
                        <TableHead className="font-semibold text-text text-xs">Type</TableHead>
                        <TableHead className="font-semibold text-text text-xs">Calc</TableHead>
                        <TableHead className="font-semibold text-text text-xs text-right">Value</TableHead>
                        <TableHead className="font-semibold text-text text-xs text-center">Order</TableHead>
                        <TableHead className="font-semibold text-text text-xs text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedComponents.map((comp) => (
                        <TableRow 
                          key={comp.id} 
                          className={`hover:bg-surface-offset/50 transition-colors ${draggedId === comp.id ? 'opacity-50' : ''}`}
                          draggable={!editingComp}
                          onDragStart={() => setDraggedId(comp.id)}
                          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                          onDrop={(e) => handleDrop(e, comp.id)}
                          onDragEnd={() => setDraggedId(null)}
                        >
                          {editingComp?.id === comp.id ? (
                            <>
                              <TableCell>
                                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-7 text-xs" />
                              </TableCell>
                              <TableCell>
                                <Select value={editCategory} onValueChange={setEditCategory}>
                                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="EARNING">Earning</SelectItem>
                                    <SelectItem value="DEDUCTION">Deduction</SelectItem>
                                    <SelectItem value="REIMBURSEMENT">Reimbursement</SelectItem>
                                    <SelectItem value="BONUS">Bonus</SelectItem>
                                    <SelectItem value="STATUTORY_EMPLOYEE">Statutory (Emp)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Select value={editCalcType} onValueChange={setEditCalcType}>
                                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="FIXED">Fixed</SelectItem>
                                    <SelectItem value="PERCENTAGE_OF_BASIC">% Basic</SelectItem>
                                    <SelectItem value="PERCENTAGE_OF_GROSS">% Gross</SelectItem>
                                    <SelectItem value="PERCENTAGE_OF_CTC">% CTC</SelectItem>
                                    <SelectItem value="FORMULA">Formula</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                {editCalcType === 'FORMULA' ? (
                                  <Input value={editFormula} onChange={(e) => setEditFormula(e.target.value)} placeholder="e.g. BASIC * 0.4" className="h-7 text-xs" />
                                ) : (
                                  <Input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="h-7 text-xs text-right" />
                                )}
                              </TableCell>
                              <TableCell>
                                <Input type="number" value={editOrder} onChange={(e) => setEditOrder(e.target.value)} className="h-7 text-xs text-center" />
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-emerald-600" onClick={handleSaveEdit} disabled={updateMutation.isPending}>
                                    <Check className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-text-muted" onClick={() => setEditingComp(null)}>
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell className="font-medium text-text text-sm">{comp.name}</TableCell>
                              <TableCell>
                                <Badge className={
                                  comp.category === 'EARNING' || comp.category === 'BONUS' || comp.category === 'REIMBURSEMENT'
                                  ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                                  : 'bg-red-500/15 text-red-600 border-red-500/30'
                                }>
                                  {comp.category === 'STATUTORY_EMPLOYEE' ? 'Statutory' : comp.category.charAt(0) + comp.category.slice(1).toLowerCase()}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-text-muted">{calcTypeLabel(comp.calculationType)}</TableCell>
                              <TableCell className="text-right font-mono text-sm font-semibold text-text">{formatCompValue(comp)}</TableCell>
                              <TableCell className="text-center font-mono text-sm text-text-muted">{comp.order}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleStartEdit(comp)}>
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => handleDeleteComponent(comp.id)}
                                    disabled={deleteMutation.isPending}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* Add Component Form */}
            <div className="border border-border rounded-xl p-4 bg-surface-offset/30">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-text flex items-center gap-2">
                  <Plus className="h-4 w-4 text-primary" />
                  Add Component
                </h4>
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-md p-3 mb-4 flex items-start gap-2">
                <FileText className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-text-muted leading-relaxed">
                  <span className="font-semibold text-text">Note:</span> Do not manually create components for standard statutory deductions like <span className="font-semibold">PF, ESIC, Professional Tax (PT), LWF, or Income Tax (TDS)</span>. The payroll engine automatically calculates and deducts these based on government rules configured in the Admin Settings.
                </p>
              </div>
              <form onSubmit={handleAddComponent} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor="add-comp-name">Name</Label>
                    <Input id="add-comp-name" value={compName} onChange={(e) => setCompName(e.target.value)} placeholder="Basic Pay" className="h-8 text-sm" required />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor="add-comp-type">Category</Label>
                    <Select value={compCategory} onValueChange={setCompCategory}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EARNING">Earning</SelectItem>
                        <SelectItem value="DEDUCTION">Deduction</SelectItem>
                        <SelectItem value="REIMBURSEMENT">Reimbursement</SelectItem>
                        <SelectItem value="BONUS">Bonus</SelectItem>
                        <SelectItem value="STATUTORY_EMPLOYEE">Statutory Deduction (Emp)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor="add-comp-code">Code (Optional)</Label>
                    <Input id="add-comp-code" value={compCode} onChange={(e) => setCompCode(e.target.value.toUpperCase())} placeholder="e.g. HRA" className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor="add-comp-calc">Calculation</Label>
                    <Select value={compCalcType} onValueChange={setCompCalcType}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FIXED">Fixed</SelectItem>
                        <SelectItem value="PERCENTAGE_OF_BASIC">% of Basic</SelectItem>
                        <SelectItem value="PERCENTAGE_OF_GROSS">% of Gross</SelectItem>
                        <SelectItem value="PERCENTAGE_OF_CTC">% of CTC</SelectItem>
                        <SelectItem value="FORMULA">Formula</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {compCalcType === 'FORMULA' ? (
                    <div className="space-y-1">
                      <Label className="text-xs" htmlFor="add-comp-formula">Formula</Label>
                      <Input id="add-comp-formula" value={compFormula} onChange={(e) => setCompFormula(e.target.value)} placeholder="e.g. BASIC * 0.4" className="h-8 text-sm" required />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Label className="text-xs" htmlFor="add-comp-value">Value</Label>
                      <Input id="add-comp-value" type="number" step="any" value={compValue} onChange={(e) => setCompValue(e.target.value)} placeholder="0" className="h-8 text-sm" required />
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor="add-comp-order">Order</Label>
                    <Input id="add-comp-order" type="number" value={compOrder} onChange={(e) => setCompOrder(e.target.value)} placeholder="0" className="h-8 text-sm" />
                  </div>
                </div>
                <Button type="submit" size="sm" disabled={addMutation.isPending} className="w-full">
                  {addMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Plus className="h-4 w-4 mr-1" />
                  Add Component
                </Button>
              </form>
            </div>
            </div>

            {/* Live Preview Panel */}
            <div className="space-y-6 min-w-0">
              <SalaryPreview 
                structureId={structure.id} 
                basicSalary={basicSalary} 
                componentsRefreshKey={JSON.stringify(structure.components.map(c => `${c.id}-${c.order}-${c.value}`))} 
              />
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

// ── Payroll Run Detail Dialog ────────────────────────────────
function PayrollRunDetailDialog({
  runId,
  open,
  onOpenChange,
}: {
  runId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: run, isLoading } = usePayrollRun(runId || '');
  const lockMutation = useLockPayroll();
  const [expandedSlip, setExpandedSlip] = useState<string | null>(null);
  const [selectedSlips, setSelectedSlips] = useState<Set<string>>(new Set());

  const handleSelectAll = (checked: boolean) => {
    if (checked && run?.payslips) {
      setSelectedSlips(new Set(run.payslips.map(ps => ps.id)));
    } else {
      setSelectedSlips(new Set());
    }
  };

  const handleSelectSlip = (id: string, checked: boolean) => {
    const next = new Set(selectedSlips);
    if (checked) next.add(id);
    else next.delete(id);
    setSelectedSlips(next);
  };

  const handleLock = () => {
    if (!runId) return;
    lockMutation.mutate(runId, {
      onSuccess: () => onOpenChange(false),
    });
  };

  const totals = useMemo(() => {
    if (!run?.payslips) return { gross: 0, net: 0, deductions: 0 };
    return run.payslips.reduce(
      (acc, ps) => ({
        gross: acc.gross + ps.grossEarnings,
        net: acc.net + ps.netPayable,
        deductions: acc.deductions + ps.totalDeductions,
      }),
      { gross: 0, net: 0, deductions: 0 }
    );
  }, [run?.payslips]);

  const canLock = run?.status === 'COMPLETED';
  const { data: companySettings } = useSettings();

  const handleExportPdf = () => {
    if (!run?.payslips) return;
    const toDownload = selectedSlips.size > 0 
      ? run.payslips.filter(ps => selectedSlips.has(ps.id))
      : run.payslips;
    generatePayslipPdf(toDownload, companySettings, true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[85vh] flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Payroll Run Detail
          </DialogTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={!run?.payslips?.length}>
              <Download className="w-4 h-4 mr-2" /> 
              {selectedSlips.size > 0 ? `Download Selected (${selectedSlips.size})` : 'Download All (PDF)'}
            </Button>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
          </div>
        ) : run ? (
          <div className="space-y-4 overflow-y-auto flex-1 pr-1">
            {/* Run Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-surface-offset/50 border border-border">
                <p className="text-xs text-text-muted font-medium">Period</p>
                <p className="text-sm font-semibold text-text">{MONTH_NAMES[run.month - 1]} {run.year}</p>
              </div>
              <div className="p-3 rounded-lg bg-surface-offset/50 border border-border">
                <p className="text-xs text-text-muted font-medium">Status</p>
                <div className="mt-1">{getStatusBadge(run.status)}</div>
              </div>
              <div className="p-3 rounded-lg bg-surface-offset/50 border border-border">
                <p className="text-xs text-text-muted font-medium">Total Gross</p>
                <p className="text-sm font-semibold text-emerald-600">{formatCurrency(totals.gross)}</p>
              </div>
              <div className="p-3 rounded-lg bg-surface-offset/50 border border-border">
                <p className="text-xs text-text-muted font-medium">Total Net</p>
                <p className="text-sm font-semibold text-primary">{formatCurrency(totals.net)}</p>
              </div>
            </div>

            {/* Payslips Table */}
            {run.payslips && run.payslips.length > 0 ? (
              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader className="bg-surface-offset/50">
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox 
                          checked={run.payslips.length > 0 && selectedSlips.size === run.payslips.length}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="font-semibold text-text text-xs w-8"></TableHead>
                      <TableHead className="font-semibold text-text text-xs">Employee</TableHead>
                      <TableHead className="font-semibold text-text text-xs text-right">Basic</TableHead>
                      <TableHead className="font-semibold text-text text-xs text-right">Gross</TableHead>
                      <TableHead className="font-semibold text-text text-xs text-right">Deductions</TableHead>
                      <TableHead className="font-semibold text-text text-xs text-right">Net Pay</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {run.payslips.map((ps) => (
                      <React.Fragment key={ps.id}>
                        <TableRow
                          className="hover:bg-surface-offset/50 transition-colors cursor-pointer"
                          onClick={() => setExpandedSlip(expandedSlip === ps.id ? null : ps.id)}
                        >
                          <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                            <Checkbox 
                              checked={selectedSlips.has(ps.id)}
                              onCheckedChange={(c) => handleSelectSlip(ps.id, !!c)}
                            />
                          </TableCell>
                          <TableCell className="w-8">
                            {expandedSlip === ps.id ? (
                              <ChevronDown className="h-4 w-4 text-text-muted" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-text-muted" />
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-text text-sm">
                                {ps.employee?.firstName} {ps.employee?.lastName}
                              </p>
                              <p className="text-xs text-text-muted">
                                {ps.employee?.employeeCode} · {ps.employee?.department?.name || 'No Dept'}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">{formatCurrency(ps.basicSalary)}</TableCell>
                          <TableCell className="text-right font-mono text-sm text-emerald-600">{formatCurrency(ps.grossEarnings)}</TableCell>
                          <TableCell className="text-right font-mono text-sm text-red-500">{formatCurrency(ps.totalDeductions)}</TableCell>
                          <TableCell className="text-right font-mono text-sm font-semibold text-text">{formatCurrency(ps.netPayable)}</TableCell>
                        </TableRow>

                        {/* Expanded Breakdown */}
                        {expandedSlip === ps.id && (
                          <TableRow>
                            <TableCell colSpan={7} className="bg-surface-offset/30 p-0">
                              <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Earnings */}
                                <div>
                                  <h5 className="text-xs font-semibold text-emerald-600 mb-2 uppercase tracking-wider">Earnings</h5>
                                  <div className="space-y-1.5">
                                    {Object.entries(ps.earnings).map(([name, amount]) => (
                                      <div key={name} className="flex justify-between text-sm">
                                        <span className="text-text-muted">{name}</span>
                                        <span className="font-mono text-text">{formatCurrency(amount)}</span>
                                      </div>
                                    ))}
                                    <div className="flex justify-between text-sm pt-1.5 border-t border-border font-semibold">
                                      <span className="text-emerald-600">Total Earnings</span>
                                      <span className="font-mono text-emerald-600">{formatCurrency(ps.grossEarnings)}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Deductions */}
                                <div>
                                  <h5 className="text-xs font-semibold text-red-500 mb-2 uppercase tracking-wider">Deductions</h5>
                                  <div className="space-y-1.5">
                                    {Object.entries(ps.deductions).map(([name, amount]) => (
                                      <div key={name} className="flex justify-between text-sm">
                                        <span className="text-text-muted">{name}</span>
                                        <span className="font-mono text-text">{formatCurrency(amount)}</span>
                                      </div>
                                    ))}
                                    {Object.keys(ps.deductions).length === 0 && (
                                      <p className="text-xs text-text-muted italic">No deductions</p>
                                    )}
                                    <div className="flex justify-between text-sm pt-1.5 border-t border-border font-semibold">
                                      <span className="text-red-500">Total Deductions</span>
                                      <span className="font-mono text-red-500">{formatCurrency(ps.totalDeductions)}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Attendance Info */}
                                <div className="md:col-span-2 flex gap-4 text-xs text-text-muted pt-2 border-t border-border">
                                  <span>Working Days: <strong className="text-text">{ps.workingDays}</strong></span>
                                  <span>Present Days: <strong className="text-text">{ps.presentDays}</strong></span>
                                  <span className="ml-auto font-semibold text-primary text-sm">
                                    Net Payable: {formatCurrency(ps.netPayable)}
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyState
                icon={<FileText className="h-8 w-8" />}
                title="No payslips"
                description="This payroll run has no payslips."
                className="min-h-[150px]"
              />
            )}

            {/* Summary Row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                <p className="text-xs text-emerald-600 font-medium">Total Gross</p>
                <p className="text-lg font-semibold font-mono text-emerald-600">{formatCurrency(totals.gross)}</p>
              </div>
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                <p className="text-xs text-red-500 font-medium">Total Deductions</p>
                <p className="text-lg font-semibold font-mono text-red-500">{formatCurrency(totals.deductions)}</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
                <p className="text-xs text-primary font-medium">Total Net Pay</p>
                <p className="text-lg font-semibold font-mono text-primary">{formatCurrency(totals.net)}</p>
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter className="border-t border-border pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          {canLock && (
            <Button
              className="bg-slate-700 hover:bg-slate-800 text-white"
              onClick={handleLock}
              disabled={lockMutation.isPending}
            >
              {lockMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Lock className="mr-2 h-4 w-4" />
              )}
              Lock Payroll
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Admin Payroll Page ────────────────────────────────────────
export function AdminPayrollPage() {
  const [activeTab, setActiveTab] = useState('structures');

  // Structures
  const [createOpen, setCreateOpen] = useState(false);
  
  // Assign & Configure Modal State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignModalStructureId, setAssignModalStructureId] = useState<string | null>(null);

  // Sheet State
  const [sheetStructureId, setSheetStructureId] = useState<string | null>(null);
  const [sheetBasicSalary, setSheetBasicSalary] = useState<number>(0);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Payroll Runs
  const [runMonth, setRunMonth] = useState((new Date().getMonth() + 1).toString());
  const [runYear, setRunYear] = useState(new Date().getFullYear().toString());
  const [runDetailId, setRunDetailId] = useState<string | null>(null);
  const [runDetailOpen, setRunDetailOpen] = useState(false);

  // Queries
  const { data: structures, isLoading: isLoadingStructures } = useStructures();
  const { data: runsData, isLoading: isLoadingRuns } = usePayrollRuns({ page: 1, limit: 50 });

  // Mutations
  const deleteStructureMutation = useDeleteStructure();
  const generateMutation = useGeneratePayroll();
  const lockMutation = useLockPayroll();
  const deleteRunMutation = useDeletePayrollRun();

  const handleViewStructure = (id: string, basicSalary: number) => {
    setSheetBasicSalary(basicSalary);
    setSheetStructureId(id);
    setSheetOpen(true);
  };

  const handleAssignStructure = (id: string) => {
    setAssignModalStructureId(id);
    setAssignModalOpen(true);
  };

  const handleDeleteStructure = (id: string) => {
    deleteStructureMutation.mutate(id);
  };

  const handleGeneratePayroll = () => {
    generateMutation.mutate({ month: parseInt(runMonth), year: parseInt(runYear) });
  };

  const handleViewRun = (id: string) => {
    setRunDetailId(id);
    setRunDetailOpen(true);
  };

  const handleLockRun = (id: string) => {
    lockMutation.mutate(id);
  };

  const handleDeleteRun = (id: string) => {
    deleteRunMutation.mutate(id);
  };

  // Stats
  const runStats = useMemo(() => {
    const runs = runsData?.data || [];
    const totalRuns = runsData?.meta?.total || runs.length;
    const latestRun = runs[0];
    const totalEmployees = runs.reduce((sum, r) => sum + (r._count?.payslips || 0), 0);
    return { totalRuns, latestStatus: latestRun?.status || null, totalEmployees };
  }, [runsData]);

  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6 h-full flex flex-col">
      <PageHeader
        title="Payroll Management"
        description="Configure salary structures, generate payroll, and manage employee compensation."
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-fit bg-surface border border-border">
          <TabsTrigger value="structures">
            <Layers className="h-4 w-4 mr-1.5" />
            Salary Structures
          </TabsTrigger>
          <TabsTrigger value="runs">
            <IndianRupee className="h-4 w-4 mr-1.5" />
            Payroll Runs
          </TabsTrigger>
        </TabsList>

        {/* ── Salary Structures Tab ─────────────────────────── */}
        <TabsContent value="structures" className="mt-6 flex-1 focus-visible:outline-none focus-visible:ring-0">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-section-title text-text font-display flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  Salary Structures
                </h2>
                <p className="text-sm text-text-muted mt-1">Define compensation packages with earnings and deductions</p>
              </div>
              <Button onClick={() => setCreateOpen(true)} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-1" />
                Create Structure
              </Button>
            </div>

            {/* Structures Grid */}
            {isLoadingStructures ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
              </div>
            ) : !structures?.length ? (
              <EmptyState
                icon={<Layers className="h-8 w-8" />}
                title="No salary structures"
                description='Create your first salary structure by clicking "Create Structure" above.'
                className="min-h-[300px]"
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {structures.map((structure) => {
                  const earnings = structure.components.filter((c) => c.type === 'EARNING').length;
                  const deductions = structure.components.filter((c) => c.type === 'DEDUCTION').length;

                  return (
                    <Card key={structure.id} className="group hover:shadow-elevated transition-all duration-200 overflow-hidden">
                      {/* Gradient accent bar */}
                      <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40" />
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <Layers className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-base font-semibold text-text">{structure.name}</CardTitle>
                              <p className="text-xs text-text-muted mt-0.5">
                                Created {format(new Date(structure.createdAt), 'MMM dd, yyyy')}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Badges */}
                        <div className="flex flex-wrap gap-2">
                          <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">
                            {earnings} Earning{earnings !== 1 ? 's' : ''}
                          </Badge>
                          <Badge className="bg-red-500/15 text-red-600 border-red-500/30">
                            {deductions} Deduction{deductions !== 1 ? 's' : ''}
                          </Badge>
                          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                            <Users className="h-3 w-3 mr-1" />
                            {structure._count?.employees || 0} Employee{(structure._count?.employees || 0) !== 1 ? 's' : ''}
                          </Badge>
                        </div>

                        {/* Assigned Employee (if any) */}
                        {structure.employees && structure.employees.length > 0 && (
                          <div className="text-xs text-text-muted mt-2 border border-border/50 rounded-lg p-2 bg-surface-offset/30">
                            <span className="font-medium text-text">Assigned to:</span>{' '}
                            {structure.employees[0].firstName} {structure.employees[0].lastName}{structure.employees[0].employeeCode ? ` (${structure.employees[0].employeeCode})` : ''}
                            {structure._count?.employees && structure._count.employees > 1 ? ` +${structure._count.employees - 1} more` : ''}
                          </div>
                        )}

                        {/* Component Summary */}
                        {structure.components.length > 0 && (
                          <div className="text-xs text-text-muted space-y-1 bg-surface-offset/50 rounded-lg p-2.5 border border-border">
                            {structure.components.slice(0, 3).map((comp) => (
                              <div key={comp.id} className="flex justify-between">
                                <span>{comp.name}</span>
                                <span className="font-mono font-medium text-text">
                                  {comp.calculationType === 'FIXED'
                                    ? formatCurrency(comp.value)
                                    : `${comp.value}%`}
                                </span>
                              </div>
                            ))}
                            {structure.components.length > 3 && (
                              <p className="text-text-muted text-center pt-1">+{structure.components.length - 3} more</p>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-1">
                          {(structure._count?.employees || 0) === 0 ? (
                            <Button variant="outline" size="sm" onClick={() => handleAssignStructure(structure.id)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Assign Structure
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" onClick={() => handleViewStructure(structure.id, structure.employees?.[0]?.basicSalary || 0)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View & Edit
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteStructure(structure.id)}
                            disabled={deleteStructureMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Payroll Runs Tab ──────────────────────────────── */}
        <TabsContent value="runs" className="mt-6 flex-1 space-y-6 focus-visible:outline-none focus-visible:ring-0">
          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {isLoadingRuns ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
            ) : (
              <>
                <StatsCard
                  title="Total Runs"
                  value={runStats.totalRuns}
                  icon={<FileText className="h-5 w-5 text-primary" />}
                />
                <StatsCard
                  title="Latest Run Status"
                  value={runStats.latestStatus || 'N/A'}
                  icon={<TrendingUp className="h-5 w-5 text-emerald-500" />}
                />
                <StatsCard
                  title="Total Employees Processed"
                  value={runStats.totalEmployees}
                  icon={<Users className="h-5 w-5 text-blue-500" />}
                />
              </>
            )}
          </div>

          {/* Generate Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Generate Payroll
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-end gap-4">
                <div className="space-y-1.5 w-full sm:w-auto">
                  <Label className="text-xs font-medium">Month</Label>
                  <Select value={runMonth} onValueChange={setRunMonth}>
                    <SelectTrigger className="w-full sm:w-[180px] bg-bg h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTH_NAMES.map((name, idx) => (
                        <SelectItem key={idx} value={(idx + 1).toString()}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 w-full sm:w-auto">
                  <Label className="text-xs font-medium">Year</Label>
                  <Input
                    type="number"
                    value={runYear}
                    onChange={(e) => setRunYear(e.target.value)}
                    min={currentYear - 2}
                    max={currentYear + 1}
                    className="w-full sm:w-[120px] h-9"
                  />
                </div>
                <Button onClick={handleGeneratePayroll} disabled={generateMutation.isPending}>
                  {generateMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <IndianRupee className="mr-2 h-4 w-4" />
                  )}
                  Generate Payroll
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Runs Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Payroll Runs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingRuns ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />) }
                </div>
              ) : !runsData?.data?.length ? (
                <EmptyState
                  icon={<IndianRupee className="h-8 w-8" />}
                  title="No payroll runs"
                  description="Generate your first payroll run using the form above."
                  className="min-h-[200px]"
                />
              ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-surface-offset/50">
                      <TableRow>
                        <TableHead className="font-semibold text-text">Month</TableHead>
                        <TableHead className="font-semibold text-text">Year</TableHead>
                        <TableHead className="font-semibold text-text">Status</TableHead>
                        <TableHead className="font-semibold text-text text-center">Payslips</TableHead>
                        <TableHead className="font-semibold text-text">Created</TableHead>
                        <TableHead className="font-semibold text-text text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {runsData.data.map((run) => (
                        <TableRow key={run.id} className="hover:bg-surface-offset/50 transition-colors">
                          <TableCell className="font-medium text-text">{MONTH_NAMES[run.month - 1]}</TableCell>
                          <TableCell className="font-mono text-text">{run.year}</TableCell>
                          <TableCell>{getStatusBadge(run.status)}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="font-mono">
                              {run._count?.payslips || 0}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-text-muted text-sm">
                            {format(new Date(run.createdAt), 'MMM dd, yyyy · hh:mm a')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleViewRun(run.id)}>
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              {run.status === 'COMPLETED' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-slate-600 hover:bg-slate-100"
                                  onClick={() => handleLockRun(run.id)}
                                  disabled={lockMutation.isPending}
                                >
                                  <Lock className="h-4 w-4 mr-1" />
                                  Lock
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteRun(run.id)}
                                disabled={deleteRunMutation.isPending}
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
      </Tabs>

      {/* Dialogs / Sheets */}
      <CreateStructureDialog open={createOpen} onOpenChange={setCreateOpen} />
      <AssignEmployeeModal
        open={assignModalOpen}
        onOpenChange={setAssignModalOpen}
        structureId={assignModalStructureId}
        onSuccess={(basicSalary) => {
          setSheetBasicSalary(basicSalary);
          setSheetStructureId(assignModalStructureId);
          setSheetOpen(true);
        }}
      />
      <StructureDetailSheet
        structureId={sheetStructureId}
        basicSalary={sheetBasicSalary}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
      <PayrollRunDetailDialog runId={runDetailId} open={runDetailOpen} onOpenChange={setRunDetailOpen} />
    </div>
  );
}
