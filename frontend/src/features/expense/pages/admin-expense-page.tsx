import { useState } from 'react';
import { format } from 'date-fns';
import { IndianRupee, Clock, CheckCircle2, XCircle, Search, Filter, FileText, CreditCard, ChevronRight, FileImage, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

import { useAllClaims, useExpenseSummary, useReviewClaim, useUpdatePayment, type ExpenseClaim } from '../api';

const reviewSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  remarks: z.string().optional(),
});

export function AdminExpensePage() {
  const [selectedClaim, setSelectedClaim] = useState<ExpenseClaim | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  
  const { data: summaryData } = useExpenseSummary();
  const summary = summaryData || {
    totalPending: 0, totalApproved: 0, totalRejected: 0,
    pendingAmount: 0, approvedAmount: 0, paidAmount: 0,
  };

  const { data: claimsData, isLoading } = useAllClaims({
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
    limit: 50,
  });
  const claims = claimsData?.data || [];

  const reviewMutation = useReviewClaim();
  const paymentMutation = useUpdatePayment();

  const reviewForm = useForm<z.infer<typeof reviewSchema>>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { status: 'APPROVED', remarks: '' },
  });

  const onReviewSubmit = (values: z.infer<typeof reviewSchema>) => {
    if (!selectedClaim) return;
    reviewMutation.mutate(
      { id: selectedClaim.id, data: values },
      { onSuccess: () => setSelectedClaim(null) }
    );
  };

  const handlePaymentUpdate = (id: string, newStatus: string) => {
    paymentMutation.mutate(
      { id, data: { paymentStatus: newStatus } },
      { onSuccess: () => setSelectedClaim(null) }
    );
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
      case 'PAID': return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center w-fit"><CheckCircle2 className="w-3 h-3 mr-1"/> Paid</span>;
      case 'APPROVED_FOR_PAYMENT': return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center w-fit"><Clock className="w-3 h-3 mr-1"/> Payout Processing</span>;
      case 'UNPAID': return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-500/10 text-gray-500 border border-gray-500/20">Unpaid</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-page-title font-display text-text">Reimbursement Management</h1>
          <p className="text-text-muted">Review, approve, and process employee reimbursement claims</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-surface border-border overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent" />
          <CardContent className="p-6 flex flex-col justify-between h-full relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-amber-500/10 p-3 rounded-xl">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <span className="text-xs font-medium text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full">{summary.totalPending} Claims</span>
            </div>
            <div>
              <p className="text-sm font-medium text-text-muted mb-1">Pending Review</p>
              <h3 className="text-2xl font-display text-text">₹{summary.pendingAmount.toLocaleString()}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface border-border overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
          <CardContent className="p-6 flex flex-col justify-between h-full relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-emerald-500/10 p-3 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">{summary.totalApproved} Claims</span>
            </div>
            <div>
              <p className="text-sm font-medium text-text-muted mb-1">Approved Amount</p>
              <h3 className="text-2xl font-display text-text">₹{summary.approvedAmount.toLocaleString()}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface border-border overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent" />
          <CardContent className="p-6 flex flex-col justify-between h-full relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-indigo-500/10 p-3 rounded-xl">
                <CreditCard className="w-5 h-5 text-indigo-500" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-text-muted mb-1">Paid Out (This Month)</p>
              <h3 className="text-2xl font-display text-text">₹{summary.paidAmount.toLocaleString()}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface border-border overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent" />
          <CardContent className="p-6 flex flex-col justify-between h-full relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-rose-500/10 p-3 rounded-xl">
                <XCircle className="w-5 h-5 text-rose-500" />
              </div>
              <span className="text-xs font-medium text-rose-500 bg-rose-500/10 px-2 py-1 rounded-full">{summary.totalRejected} Claims</span>
            </div>
            <div>
              <p className="text-sm font-medium text-text-muted mb-1">Rejected</p>
              <h3 className="text-2xl font-display text-text">—</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card className="bg-surface border-border overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4">
          <div>
            <CardTitle>Reimbursement Claims</CardTitle>
            <CardDescription>Review and process employee claims</CardDescription>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-text-muted" />
              <Input placeholder="Search employee..." className="pl-9 bg-background" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        
        <div className="overflow-x-auto scroll-touch scrollbar-none">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-text-muted uppercase bg-background/50 border-y border-border">
              <tr>
                <th className="px-6 py-4 font-medium">Employee</th>
                <th className="px-6 py-4 font-medium">Claim Title</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-text-muted">Loading claims...</td>
                </tr>
              ) : claims.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <FileText className="h-10 w-10 text-text-muted/30 mb-3" />
                      <p className="text-text-muted">No reimbursement claims found matching your filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                claims.map((claim) => (
                  <tr key={claim.id} className="border-b border-border/50 hover:bg-background/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 rounded-md border border-border/50">
                          <AvatarImage src={claim.employee?.profilePhotoUrl || ''} />
                          <AvatarFallback className="rounded-md bg-primary/10 text-primary text-xs">
                            {claim.employee?.firstName.charAt(0)}{claim.employee?.lastName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-text">{claim.employee?.firstName} {claim.employee?.lastName}</div>
                          <div className="text-xs text-text-muted">{claim.employee?.employeeCode}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-text">{claim.title}</div>
                      <div className="text-xs text-text-muted capitalize">{claim.category.replace('_', ' ').toLowerCase()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-display font-medium text-text">₹{claim.totalAmount.toLocaleString()}</div>
                      <div className="text-xs text-text-muted">{claim._count?.items} items</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-text">{format(new Date(claim.createdAt), 'MMM d, yyyy')}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5 items-start">
                        {getStatusBadge(claim.status)}
                        {claim.status === 'APPROVED' && getPaymentBadge(claim.paymentStatus)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-primary hover:text-primary hover:bg-primary/10"
                        onClick={() => setSelectedClaim(claim)}
                      >
                        Review
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selectedClaim} onOpenChange={(open) => !open && setSelectedClaim(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-surface border-border/50">
          {selectedClaim && (
            <>
              <DialogHeader className="pb-4 border-b border-border/50">
                <div className="flex justify-between items-start pr-6">
                  <div>
                    <DialogTitle className="text-xl mb-1">{selectedClaim.title}</DialogTitle>
                    <DialogDescription>
                      Submitted by {selectedClaim.employee?.firstName} {selectedClaim.employee?.lastName} on {format(new Date(selectedClaim.createdAt), 'MMMM d, yyyy')}
                    </DialogDescription>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-2xl font-display font-bold text-primary">₹{selectedClaim.totalAmount.toLocaleString()}</div>
                    {getStatusBadge(selectedClaim.status)}
                  </div>
                </div>
              </DialogHeader>

              <div className="py-4 space-y-6">
                {/* Items Breakdown */}
                <div>
                  <h4 className="text-sm font-medium text-text-muted mb-3 uppercase tracking-wider">Reimbursement Items Breakdown</h4>
                  <div className="border border-border/50 rounded-lg overflow-x-auto scroll-touch scrollbar-none">
                    <table className="w-full text-sm whitespace-nowrap">
                      <thead className="bg-background/80 text-text-muted">
                        <tr>
                          <th className="px-4 py-2 font-medium text-left">Date</th>
                          <th className="px-4 py-2 font-medium text-left">Description</th>
                          <th className="px-4 py-2 font-medium text-right">Amount</th>
                          <th className="px-4 py-2 font-medium text-center">Receipt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {selectedClaim.items.map((item) => (
                          <tr key={item.id} className="bg-surface">
                            <td className="px-4 py-3 whitespace-nowrap text-text-muted">{format(new Date(item.date), 'MMM d')}</td>
                            <td className="px-4 py-3 text-text">{item.description}</td>
                            <td className="px-4 py-3 text-right font-medium text-text">₹{item.amount.toLocaleString()}</td>
                            <td className="px-4 py-3 text-center">
                              {item.receiptUrl ? (
                                <a href={item.receiptUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center p-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                                  <FileImage className="w-4 h-4" />
                                </a>
                              ) : (
                                <span className="text-text-muted/50">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Status Workflows */}
                {selectedClaim.status === 'PENDING' ? (
                  <form onSubmit={reviewForm.handleSubmit(onReviewSubmit)} className="space-y-4 bg-background/50 p-4 rounded-lg border border-border/50">
                    <h4 className="text-sm font-medium text-text uppercase tracking-wider flex items-center"><User className="w-4 h-4 mr-2"/> Manager Review</h4>
                    <div className="space-y-3">
                      <div>
                        <Label>Action</Label>
                        <Select onValueChange={(v) => reviewForm.setValue('status', v as 'APPROVED' | 'REJECTED')} defaultValue="APPROVED">
                          <SelectTrigger className="bg-surface">
                            <SelectValue placeholder="Select decision" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="APPROVED" className="text-emerald-500">Approve Claim</SelectItem>
                            <SelectItem value="REJECTED" className="text-rose-500">Reject Claim</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Remarks (Optional)</Label>
                        <Textarea {...reviewForm.register('remarks')} placeholder="Add comments for the employee..." className="bg-surface min-h-[80px]" />
                      </div>
                      <Button type="submit" className="w-full bg-primary text-white" disabled={reviewMutation.isPending}>
                        Submit Decision
                      </Button>
                    </div>
                  </form>
                ) : selectedClaim.status === 'APPROVED' ? (
                  <div className="space-y-4 bg-background/50 p-4 rounded-lg border border-border/50">
                    <h4 className="text-sm font-medium text-text uppercase tracking-wider flex items-center"><CreditCard className="w-4 h-4 mr-2"/> Finance Processing</h4>
                    
                    <div className="flex items-center justify-between p-3 bg-surface rounded-md border border-border">
                      <div>
                        <div className="font-medium text-text">Current Payment Status</div>
                        <div className="mt-1">{getPaymentBadge(selectedClaim.paymentStatus)}</div>
                      </div>
                      <div className="flex gap-2">
                        {selectedClaim.paymentStatus === 'UNPAID' && (
                          <Button variant="outline" size="sm" className="border-blue-500/30 text-blue-500 hover:bg-blue-500/10" onClick={() => handlePaymentUpdate(selectedClaim.id, 'APPROVED_FOR_PAYMENT')}>
                            Approve for Payout
                          </Button>
                        )}
                        {selectedClaim.paymentStatus !== 'PAID' && (
                          <Button size="sm" className="bg-indigo-500 text-white hover:bg-indigo-600" onClick={() => handlePaymentUpdate(selectedClaim.id, 'PAID')}>
                            Mark as Paid
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  selectedClaim.remarks && (
                    <div>
                      <h4 className="text-sm font-medium text-text-muted mb-2 uppercase tracking-wider">Review Remarks</h4>
                      <div className="p-3 rounded-lg bg-surface border border-border text-sm text-text">
                        {selectedClaim.remarks}
                      </div>
                    </div>
                  )
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
