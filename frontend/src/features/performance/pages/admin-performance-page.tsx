import { useState } from 'react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calendar, Target, ClipboardList, CheckCircle2, TrendingUp, Users, Plus, Play, Archive, Star } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';

import { DatePicker } from '@/components/ui/date-picker';
import { Controller } from 'react-hook-form';
import {
  useCycles,
  useActiveCycle,
  useCreateCycle,
  useUpdateCycleStatus,
  usePerformanceSummary,
  useAllReviews,
  useSubmitHrReview,
  type Review,
} from '../api';

const createCycleSchema = z.object({
  name: z.string().min(3, 'Required'),
  startDate: z.string().min(1, 'Required'),
  endDate: z.string().min(1, 'Required'),
});

const reviewSchema = z.object({
  hrRating: z.coerce.number().min(1).max(5),
  finalRating: z.coerce.number().min(1).max(5),
  hrComments: z.string().min(10, 'Please provide detailed comments'),
});

export function AdminPerformancePage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);

  const { data: summaryData } = usePerformanceSummary();
  const summary = summaryData || {
    activeCycle: null,
    totalCycles: 0,
    activeCycleStats: { totalReviews: 0, pendingHrReviews: 0, completedReviews: 0, averageRating: 0, completionRate: 0 },
  };

  const { data: activeCycleData } = useActiveCycle();
  const activeCycle = activeCycleData;

  const { data: reviewsData, isLoading: reviewsLoading } = useAllReviews({
    cycleId: activeCycle?.id,
    limit: 50,
  });
  const reviews = reviewsData?.data || [];

  const createCycleMutation = useCreateCycle();
  const updateStatusMutation = useUpdateCycleStatus();
  const submitReviewMutation = useSubmitHrReview();

  const cycleForm = useForm<z.infer<typeof createCycleSchema>>({
    resolver: zodResolver(createCycleSchema),
    defaultValues: { name: '', startDate: '', endDate: '' },
  });

  const reviewForm = useForm<z.infer<typeof reviewSchema>>({
    resolver: zodResolver(reviewSchema) as any,
    defaultValues: { hrRating: 3, finalRating: 3, hrComments: '' },
  });

  const onCreateCycle = (values: z.infer<typeof createCycleSchema>) => {
    createCycleMutation.mutate(values, {
      onSuccess: () => {
        setIsCreateOpen(false);
        cycleForm.reset();
      },
    });
  };

  const onReviewSubmit = (values: z.infer<typeof reviewSchema>) => {
    if (!selectedReview) return;
    submitReviewMutation.mutate(
      { id: selectedReview.id, data: values },
      { onSuccess: () => setSelectedReview(null) }
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Completed</span>;
      case 'HR_REVIEW_PENDING':
      case 'SELF_SUBMITTED': return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">HR Review Pending</span>;
      case 'SELF_REVIEW_PENDING': return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20">Employee Drafting</span>;
      default: return null;
    }
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return <span className="text-text-muted">-</span>;
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star key={star} className={`w-4 h-4 ${star <= rating ? 'text-amber-500 fill-amber-500' : 'text-border'} mr-0.5`} />
        ))}
        <span className="ml-2 font-medium">{rating.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-page-title font-display text-text">Performance Management</h1>
          <p className="text-text-muted">Manage review cycles and employee evaluations</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button disabled={!!activeCycle} className="bg-gradient-to-r from-primary to-primary-light hover:brightness-110 shadow-lg shadow-primary/20 transition-all active:scale-95">
              <Plus className="w-4 h-4 mr-2" />
              New Cycle
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-surface border-border/50">
            <DialogHeader>
              <DialogTitle>Create Review Cycle</DialogTitle>
              <DialogDescription>Start a new performance review period for all employees.</DialogDescription>
            </DialogHeader>
            <form onSubmit={cycleForm.handleSubmit(onCreateCycle)} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Cycle Name</Label>
                <Input {...cycleForm.register('name')} placeholder="e.g. H1 2026 Performance Review" className="bg-background" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Controller control={cycleForm.control} name="startDate" render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} className="bg-background" />} />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Controller control={cycleForm.control} name="endDate" render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} className="bg-background" />} />
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createCycleMutation.isPending} className="bg-primary text-white">
                  Create & Activate
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-surface border-border overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
          <CardContent className="p-6 flex flex-col justify-between h-full relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-primary/10 p-3 rounded-xl">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              {activeCycle ? (
                <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full flex items-center">
                  <Play className="w-3 h-3 mr-1" /> Active
                </span>
              ) : (
                <span className="text-xs font-medium text-gray-500 bg-gray-500/10 px-2 py-1 rounded-full">No Active Cycle</span>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-text-muted mb-1">Current Cycle</p>
              <h3 className="text-lg font-display text-text truncate" title={activeCycle?.name}>{activeCycle?.name || '—'}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface border-border overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent" />
          <CardContent className="p-6 flex flex-col justify-between h-full relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-amber-500/10 p-3 rounded-xl">
                <ClipboardList className="w-5 h-5 text-amber-500" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-text-muted mb-1">Pending HR Reviews</p>
              <h3 className="text-3xl font-display text-text">{summary.activeCycleStats.pendingHrReviews}</h3>
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
            </div>
            <div>
              <p className="text-sm font-medium text-text-muted mb-1">Completion Rate</p>
              <h3 className="text-3xl font-display text-text">{summary.activeCycleStats.completionRate}%</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface border-border overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent" />
          <CardContent className="p-6 flex flex-col justify-between h-full relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-indigo-500/10 p-3 rounded-xl">
                <TrendingUp className="w-5 h-5 text-indigo-500" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-text-muted mb-1">Avg Company Rating</p>
              <h3 className="text-3xl font-display text-text">{summary.activeCycleStats.averageRating || '—'}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reviews Table */}
      <Card className="bg-surface border-border">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4">
          <div>
            <CardTitle>Active Reviews</CardTitle>
            <CardDescription>
              {activeCycle ? `Tracking progress for ${activeCycle.name}` : 'No active cycle running.'}
            </CardDescription>
          </div>
          {activeCycle && (
            <Button 
              variant="outline" 
              className="border-primary/20 text-primary hover:bg-primary/10"
              onClick={() => updateStatusMutation.mutate({ id: activeCycle.id, status: 'COMPLETED' })}
              disabled={updateStatusMutation.isPending}
            >
              <Archive className="w-4 h-4 mr-2" /> End Cycle
            </Button>
          )}
        </CardHeader>
        
        <div className="overflow-x-auto scroll-touch scrollbar-none -mx-4 sm:mx-0 px-4 sm:px-0">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-text-muted uppercase bg-background/50 border-y border-border">
              <tr>
                <th className="px-6 py-4 font-medium">Employee</th>
                <th className="px-6 py-4 font-medium">Department</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Self Rating</th>
                <th className="px-6 py-4 font-medium">Final Rating</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!activeCycle ? (
                 <tr>
                 <td colSpan={6} className="px-6 py-12 text-center">
                   <div className="flex flex-col items-center justify-center">
                     <Target className="h-10 w-10 text-text-muted/30 mb-3" />
                     <p className="text-text-muted">No active review cycle.</p>
                   </div>
                 </td>
               </tr>
              ) : reviewsLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-text-muted">Loading reviews...</td>
                </tr>
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <p className="text-text-muted">No reviews generated yet.</p>
                  </td>
                </tr>
              ) : (
                reviews.map((review) => (
                  <tr key={review.id} className="border-b border-border/50 hover:bg-background/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 rounded-md border border-border/50">
                          <AvatarImage src={review.employee?.profilePhotoUrl || ''} />
                          <AvatarFallback className="rounded-md bg-primary/10 text-primary text-xs">
                            {review.employee?.firstName.charAt(0)}{review.employee?.lastName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-text">{review.employee?.firstName} {review.employee?.lastName}</div>
                          <div className="text-xs text-text-muted">{review.employee?.employeeCode}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-text-muted">
                      {review.employee?.department?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(review.status)}
                    </td>
                    <td className="px-6 py-4">
                      {renderStars(review.selfRating)}
                    </td>
                    <td className="px-6 py-4">
                      {renderStars(review.finalRating)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-primary hover:text-primary hover:bg-primary/10"
                        onClick={() => {
                          setSelectedReview(review);
                          reviewForm.reset({
                            hrRating: review.hrRating || 3,
                            finalRating: review.finalRating || 3,
                            hrComments: review.hrComments || '',
                          });
                        }}
                      >
                        {review.status === 'COMPLETED' ? 'View' : 'Evaluate'}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* HR Review Dialog */}
      <Dialog open={!!selectedReview} onOpenChange={(open) => !open && setSelectedReview(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-surface border-border/50">
          {selectedReview && (
            <>
              <DialogHeader className="pb-4 border-b border-border/50">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 rounded-md">
                    <AvatarImage src={selectedReview.employee?.profilePhotoUrl || ''} />
                    <AvatarFallback className="bg-primary/10 text-primary">{selectedReview.employee?.firstName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle className="text-xl">{selectedReview.employee?.firstName} {selectedReview.employee?.lastName}</DialogTitle>
                    <DialogDescription>
                      Performance Evaluation — {selectedReview.cycle?.name}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="py-4 space-y-6">
                {/* Employee Self-Review */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-text uppercase tracking-wider flex items-center">
                    <Users className="w-4 h-4 mr-2" /> Employee Self-Evaluation
                  </h4>
                  {selectedReview.status === 'SELF_REVIEW_PENDING' ? (
                    <div className="p-4 bg-background/50 rounded-lg border border-border border-dashed text-center">
                      <p className="text-text-muted text-sm">Employee has not submitted their self-review yet.</p>
                    </div>
                  ) : (
                    <div className="p-4 bg-background/50 rounded-lg border border-border">
                      <div className="flex items-center justify-between mb-3 pb-3 border-b border-border/50">
                        <span className="text-sm font-medium text-text-muted">Self Rating</span>
                        {renderStars(selectedReview.selfRating)}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-text-muted block mb-1">Comments</span>
                        <p className="text-sm text-text whitespace-pre-wrap">{selectedReview.selfComments}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* HR Review Form */}
                <form onSubmit={reviewForm.handleSubmit(onReviewSubmit as any)} className="space-y-4">
                  <h4 className="text-sm font-medium text-primary uppercase tracking-wider flex items-center">
                    <ClipboardList className="w-4 h-4 mr-2" /> HR / Manager Evaluation
                  </h4>
                  
                  {selectedReview.status === 'COMPLETED' ? (
                     <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                     <div className="flex items-center justify-between mb-3 pb-3 border-b border-border/50">
                       <span className="text-sm font-medium text-text-muted">Final Rating</span>
                       {renderStars(selectedReview.finalRating)}
                     </div>
                     <div>
                       <span className="text-sm font-medium text-text-muted block mb-1">HR Comments</span>
                       <p className="text-sm text-text whitespace-pre-wrap">{selectedReview.hrComments}</p>
                     </div>
                   </div>
                  ) : (
                    <div className="p-4 bg-surface rounded-lg border border-border space-y-4 shadow-sm">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Manager Rating (1-5)</Label>
                          <Input type="number" step="0.5" min="1" max="5" {...reviewForm.register('hrRating')} className="bg-background" />
                          {reviewForm.formState.errors.hrRating && <p className="text-xs text-rose-500">{reviewForm.formState.errors.hrRating.message}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label className="text-primary font-bold">Final Rating (1-5)</Label>
                          <Input type="number" step="0.5" min="1" max="5" {...reviewForm.register('finalRating')} className="bg-primary/10 border-primary/30 text-primary font-bold" />
                          {reviewForm.formState.errors.finalRating && <p className="text-xs text-rose-500">{reviewForm.formState.errors.finalRating.message}</p>}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Evaluation Comments & Feedback</Label>
                        <Textarea {...reviewForm.register('hrComments')} className="bg-background min-h-[100px]" placeholder="Provide detailed feedback on performance, achievements, and areas of improvement..." />
                        {reviewForm.formState.errors.hrComments && <p className="text-xs text-rose-500">{reviewForm.formState.errors.hrComments.message}</p>}
                      </div>
                    </div>
                  )}

                  <DialogFooter className="mt-6">
                    <Button type="button" variant="outline" onClick={() => setSelectedReview(null)}>Close</Button>
                    {selectedReview.status !== 'COMPLETED' && (
                      <Button type="submit" disabled={submitReviewMutation.isPending} className="bg-primary text-white">
                        Submit Final Review
                      </Button>
                    )}
                  </DialogFooter>
                </form>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
