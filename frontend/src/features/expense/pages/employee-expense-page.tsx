import { useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Plus, IndianRupee, FileText, CheckCircle2, Clock, XCircle, FileImage, Trash2, Edit2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { useMyClaims, useCreateClaim, useCancelClaim, type ExpenseClaim, type ExpenseCategory } from '../api';

// ── Validation Schema ──────────────────────────────────────────

const itemSchema = z.object({
  description: z.string().min(2, 'Required'),
  amount: z.number().positive('Must be > 0'),
  date: z.string().min(1, 'Required'),
  receiptBase64: z.string().optional(),
});

const formSchema = z.object({
  title: z.string().min(3, 'Required'),
  category: z.string().min(1, 'Required'),
  items: z.array(itemSchema).min(1, 'At least one item is required'),
});

type FormValues = z.infer<typeof formSchema>;

// ── Constants ─────────────────────────────────────────────────

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'TRAVEL', label: 'Travel' },
  { value: 'LOCAL_TRANSPORT', label: 'Local Transport' },
  { value: 'ACCOMMODATION', label: 'Accommodation' },
  { value: 'MEALS', label: 'Meals' },
  { value: 'CLIENT_ENTERTAINMENT', label: 'Client Entertainment' },
  { value: 'SITE_VISIT', label: 'Site Visit' },
  { value: 'OFFICE_SUPPLIES', label: 'Office Supplies' },
  { value: 'OTHER', label: 'Other' },
];

export function EmployeeExpensePage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<ExpenseClaim | null>(null);

  const { data, isLoading } = useMyClaims({});
  const createMutation = useCreateClaim();
  const cancelMutation = useCancelClaim();

  const claims = data?.data || [];

  // Summary stats
  const totalPending = claims.filter(c => c.status === 'PENDING').reduce((sum, c) => sum + c.totalAmount, 0);
  const totalApproved = claims.filter(c => c.status === 'APPROVED').reduce((sum, c) => sum + c.totalAmount, 0);
  const totalPaid = claims.filter(c => c.paymentStatus === 'PAID').reduce((sum, c) => sum + c.totalAmount, 0);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      category: '',
      items: [{ description: '', amount: 0, date: new Date().toISOString().split('T')[0], receiptBase64: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const onSubmit = (values: FormValues) => {
    const cleanedItems = values.items.map(item => ({
      ...item,
      receiptBase64: item.receiptBase64 ? item.receiptBase64 : undefined,
    }));

    createMutation.mutate(
      {
        title: values.title,
        category: values.category as ExpenseCategory,
        items: cleanedItems,
      },
      {
        onSuccess: () => {
          setIsCreateOpen(false);
          form.reset();
        },
      }
    );
  };



  const handleFileUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      form.setValue(`items.${index}.receiptBase64`, '');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      form.setError(`items.${index}.receiptBase64`, { message: 'File must be under 5MB' });
      return;
    }
    
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      form.setError(`items.${index}.receiptBase64`, { message: 'Only JPEG, PNG, WebP or PDF allowed' });
      return;
    }

    form.clearErrors(`items.${index}.receiptBase64`);

    const reader = new FileReader();
    reader.onloadend = () => {
      form.setValue(`items.${index}.receiptBase64`, reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED': return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Approved</span>;
      case 'PENDING': return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">Pending</span>;
      case 'REJECTED': return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-500 border border-rose-500/20">Rejected</span>;
      case 'CANCELLED': return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-500/10 text-gray-500 border border-gray-500/20">Cancelled</span>;
      default: return null;
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'PAID': return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Paid</span>;
      case 'APPROVED_FOR_PAYMENT': return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">Payment Pending</span>;
      case 'UNPAID': return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-500/10 text-gray-500 border border-gray-500/20">Unpaid</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-page-title font-display text-text">My Reimbursements</h1>
          <p className="text-text-muted">Manage your reimbursement claims</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-primary-light hover:brightness-110 shadow-lg shadow-primary/20 transition-all active:scale-95">
              <Plus className="w-4 h-4 mr-2" />
              New Claim
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-surface border-border/50">
            <DialogHeader>
              <DialogTitle className="text-xl">Create Reimbursement Claim</DialogTitle>
              <DialogDescription>Submit a new claim for reimbursement.</DialogDescription>
            </DialogHeader>

            <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Claim Title</Label>
                  <Input id="title" {...form.register('title')} placeholder="e.g. June Client Visit" className="bg-background" />
                  {form.formState.errors.title && <p className="text-xs text-rose-500">{form.formState.errors.title.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select onValueChange={(val) => form.setValue('category', val)}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.category && <p className="text-xs text-rose-500">{form.formState.errors.category.message}</p>}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Reimbursement Items</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ description: '', amount: 0, date: new Date().toISOString().split('T')[0], receiptBase64: '' })}
                    className="border-primary/20 text-primary hover:bg-primary/10"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add Item
                  </Button>
                </div>

                {fields.map((field, index) => (
                  <Card key={field.id} className="bg-background/50 border-border/50">
                    <CardContent className="p-4 space-y-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-text-muted">Item {index + 1}</span>
                        {fields.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="h-6 w-6 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Input {...form.register(`items.${index}.description` as const)} placeholder="Taxi to airport" className="bg-surface" />
                          {form.formState.errors.items?.[index]?.description && <p className="text-xs text-rose-500">{form.formState.errors.items[index]?.description?.message}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label>Amount (₹)</Label>
                          <Input type="number" step="0.01" {...form.register(`items.${index}.amount` as const, { valueAsNumber: true })} className="bg-surface" />
                          {form.formState.errors.items?.[index]?.amount && <p className="text-xs text-rose-500">{form.formState.errors.items[index]?.amount?.message}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label>Date</Label>
                          <Controller control={form.control} name={`items.${index}.date` as const} render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} className="bg-surface" />} />
                          {form.formState.errors.items?.[index]?.date && <p className="text-xs text-rose-500">{form.formState.errors.items[index]?.date?.message}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label>Receipt (Optional)</Label>
                          <Input 
                            type="file" 
                            accept="image/jpeg,image/png,image/webp,application/pdf"
                            onChange={(e) => handleFileUpload(index, e)}
                            className="bg-surface file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" 
                          />
                          {form.formState.errors.items?.[index]?.receiptBase64 && <p className="text-xs text-rose-500">{form.formState.errors.items[index]?.receiptBase64?.message}</p>}
                          {form.watch(`items.${index}.receiptBase64`) && (
                            <p className="text-xs text-emerald-500 flex items-center mt-1">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> File selected
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending} className="bg-primary text-white">
                  {createMutation.isPending ? 'Submitting...' : 'Submit Claim'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-surface border-border overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-text-muted flex items-center">
              <Clock className="w-4 h-4 mr-2 text-amber-500" />
              Pending Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display text-text">₹{totalPending.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="bg-surface border-border overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-text-muted flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" />
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display text-text">₹{totalApproved.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="bg-surface border-border overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-text-muted flex items-center">
              <IndianRupee className="w-4 h-4 mr-2 text-indigo-500" />
              Reimbursed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display text-text">₹{totalPaid.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Claims List */}
      <div className="space-y-4">
        <h2 className="text-xl font-display text-text">Recent Claims</h2>
        
        {isLoading ? (
          <div className="text-center py-12 text-text-muted">Loading...</div>
        ) : claims.length === 0 ? (
          <div className="text-center py-12 bg-surface/50 rounded-xl border border-border border-dashed">
            <FileText className="w-12 h-12 text-text-muted/30 mx-auto mb-3" />
            <p className="text-text-muted">No reimbursement claims found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {claims.map((claim) => (
              <Dialog key={claim.id} open={selectedClaim?.id === claim.id} onOpenChange={(open) => !open && setSelectedClaim(null)}>
                <DialogTrigger asChild>
                  <Card 
                    className="bg-surface border-border hover:border-primary/30 transition-colors cursor-pointer group"
                    onClick={() => setSelectedClaim(claim)}
                  >
                    <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                      <div>
                        <CardTitle className="text-base truncate pr-2 group-hover:text-primary transition-colors">{claim.title}</CardTitle>
                        <CardDescription>{CATEGORIES.find(c => c.value === claim.category)?.label}</CardDescription>
                      </div>
                      <div className="bg-background p-2 rounded-lg text-primary/80 group-hover:bg-primary/10 transition-colors">
                        <FileText className="w-5 h-5" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-end justify-between mt-2">
                        <div>
                          <div className="text-2xl font-display text-text">₹{claim.totalAmount.toLocaleString()}</div>
                          <div className="text-xs text-text-muted mt-1">{format(new Date(claim.createdAt), 'MMM d, yyyy')}</div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(claim.status)}
                          {claim.status === 'APPROVED' && getPaymentBadge(claim.paymentStatus)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </DialogTrigger>

                <DialogContent className="sm:max-w-[600px] bg-surface border-border/50">
                  <DialogHeader>
                    <div className="flex justify-between items-start pr-6">
                      <div>
                        <DialogTitle className="text-xl mb-1">{claim.title}</DialogTitle>
                        <DialogDescription>
                          Submitted on {format(new Date(claim.createdAt), 'MMMM d, yyyy')}
                        </DialogDescription>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        {getStatusBadge(claim.status)}
                        {claim.status === 'APPROVED' && getPaymentBadge(claim.paymentStatus)}
                      </div>
                    </div>
                  </DialogHeader>

                  <div className="py-4 space-y-6">
                    {/* Items List */}
                    <div>
                      <h4 className="text-sm font-medium text-text-muted mb-3 uppercase tracking-wider">Reimbursement Items</h4>
                      <div className="space-y-3">
                        {claim.items.map((item, idx) => (
                          <div key={item.id} className="flex justify-between items-center p-3 rounded-lg bg-background border border-border/50">
                            <div className="flex items-center gap-3">
                              <div className="bg-surface w-8 h-8 rounded-full flex items-center justify-center text-xs text-text-muted font-medium">
                                {idx + 1}
                              </div>
                              <div>
                                <p className="font-medium text-sm text-text">{item.description}</p>
                                <p className="text-xs text-text-muted">{format(new Date(item.date), 'MMM d, yyyy')}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="font-medium text-text">₹{item.amount.toLocaleString()}</span>
                              {item.receiptUrl && (
                                <a href={item.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-light" onClick={(e) => e.stopPropagation()}>
                                  <FileImage className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 flex justify-between items-center p-3 bg-primary/5 rounded-lg border border-primary/10">
                        <span className="font-medium text-text">Total Amount</span>
                        <span className="text-lg font-bold text-primary">₹{claim.totalAmount.toLocaleString()}</span>
                      </div>
                    </div>

                    {claim.remarks && (
                      <div>
                        <h4 className="text-sm font-medium text-text-muted mb-2 uppercase tracking-wider">Approver Remarks</h4>
                        <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-sm text-text">
                          {claim.remarks}
                        </div>
                      </div>
                    )}
                  </div>

                  <DialogFooter className="sm:justify-between">
                    {claim.status === 'PENDING' ? (
                      <Button 
                        variant="destructive" 
                        onClick={() => {
                          cancelMutation.mutate(claim.id, {
                            onSuccess: () => setSelectedClaim(null)
                          });
                        }}
                        disabled={cancelMutation.isPending}
                        className="bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/20"
                      >
                        Cancel Claim
                      </Button>
                    ) : (
                      <div /> // empty div for flex spacing
                    )}
                    <Button type="button" variant="outline" onClick={() => setSelectedClaim(null)}>Close</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
