import { useState } from 'react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calendar, Target, CheckCircle2, TrendingUp, Plus, Edit2, Play, Circle, CheckCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

import { DatePicker } from '@/components/ui/date-picker';
import { Controller } from 'react-hook-form';
import {
  useActiveCycle,
  useMyGoals,
  useCreateGoal,
  useUpdateGoalProgress,
  useMyReview,
  useSubmitSelfReview,
} from '../api';

const createGoalSchema = z.object({
  title: z.string().min(5, 'Required'),
  description: z.string().optional(),
  targetDate: z.string().optional(),
});

const selfReviewSchema = z.object({
  selfRating: z.coerce.number().min(1).max(5),
  selfComments: z.string().min(10, 'Please provide detailed comments on your performance'),
});

export function EmployeePerformancePage() {
  const [isCreateGoalOpen, setIsCreateGoalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<any>(null);

  const { data: activeCycle } = useActiveCycle();
  
  const { data: goals } = useMyGoals(activeCycle?.id);
  const { data: review } = useMyReview(activeCycle?.id);

  const createGoalMutation = useCreateGoal();
  const updateProgressMutation = useUpdateGoalProgress();
  const submitReviewMutation = useSubmitSelfReview();

  const goalForm = useForm<z.infer<typeof createGoalSchema>>({
    resolver: zodResolver(createGoalSchema),
    defaultValues: { title: '', description: '', targetDate: '' },
  });

  const reviewForm = useForm<z.infer<typeof selfReviewSchema>>({
    resolver: zodResolver(selfReviewSchema) as any,
    defaultValues: { selfRating: 3, selfComments: '' },
  });

  const onCreateGoal = (values: z.infer<typeof createGoalSchema>) => {
    if (!activeCycle) return;
    createGoalMutation.mutate(
      { cycleId: activeCycle.id, ...values },
      {
        onSuccess: () => {
          setIsCreateGoalOpen(false);
          goalForm.reset();
        },
      }
    );
  };

  const onUpdateProgress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal || !activeCycle) return;
    
    // Convert to number
    const progress = Number((document.getElementById('progressSlider') as HTMLInputElement).value);
    const status = progress === 100 ? 'COMPLETED' : progress > 0 ? 'IN_PROGRESS' : 'NOT_STARTED';

    updateProgressMutation.mutate(
      { id: selectedGoal.id, data: { progress, status }, cycleId: activeCycle.id },
      { onSuccess: () => setSelectedGoal(null) }
    );
  };

  const onSubmitReview = (values: z.infer<typeof selfReviewSchema>) => {
    if (!activeCycle) return;
    submitReviewMutation.mutate(
      { cycleId: activeCycle.id, data: values }
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'IN_PROGRESS': return <Play className="w-5 h-5 text-amber-500" />;
      case 'NOT_STARTED': return <Circle className="w-5 h-5 text-gray-400" />;
      default: return null;
    }
  };

  if (!activeCycle) {
    return (
      <div className="h-full flex-1 flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <Target className="w-16 h-16 text-text-muted/30 mb-4" />
        <h2 className="text-2xl font-display text-text mb-2">No Active Review Cycle</h2>
        <p className="text-text-muted max-w-md">You will be notified when HR starts a new performance review cycle.</p>
      </div>
    );
  }

  const cycleProgress = Math.min(
    100, 
    Math.max(0, 
      (new Date().getTime() - new Date(activeCycle.startDate).getTime()) / 
      (new Date(activeCycle.endDate).getTime() - new Date(activeCycle.startDate).getTime()) * 100
    )
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-page-title font-display text-text">My Performance</h1>
        <p className="text-text-muted">Track goals and complete your self-evaluation for the active cycle.</p>
      </div>

      {/* Active Cycle Banner */}
      <Card className="bg-gradient-to-r from-primary to-primary-light border-none text-white overflow-hidden relative shadow-lg shadow-primary/20">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-bold font-display">{activeCycle.name}</h2>
              <p className="text-white/80 text-sm mt-1">
                {format(new Date(activeCycle.startDate), 'MMM d')} - {format(new Date(activeCycle.endDate), 'MMM d, yyyy')}
              </p>
            </div>
            <div className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full text-sm font-medium border border-white/20">
              Active Cycle
            </div>
          </div>
          <div className="mt-6">
            <div className="flex justify-between text-xs text-white/80 mb-2">
              <span>Time Elapsed</span>
              <span>{Math.round(cycleProgress)}%</span>
            </div>
            <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full" style={{ width: `${cycleProgress}%` }} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Goals Section */}
        <Card className="bg-surface border-border flex flex-col h-[600px]">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-4">
            <div className="space-y-1">
              <CardTitle className="text-lg">My Goals</CardTitle>
              <CardDescription>Track objectives for this cycle</CardDescription>
            </div>
            
            <Dialog open={isCreateGoalOpen} onOpenChange={setIsCreateGoalOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="border-primary/20 text-primary hover:bg-primary/10">
                  <Plus className="w-4 h-4 mr-2" /> Add Goal
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-surface border-border/50">
                <DialogHeader>
                  <DialogTitle>Add New Goal</DialogTitle>
                </DialogHeader>
                <form onSubmit={goalForm.handleSubmit(onCreateGoal)} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Goal Title</Label>
                    <Input {...goalForm.register('title')} placeholder="e.g. Increase sales by 15%" className="bg-background" />
                    {goalForm.formState.errors.title && <p className="text-xs text-rose-500">{goalForm.formState.errors.title.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea {...goalForm.register('description')} placeholder="How will you achieve this?" className="bg-background min-h-[80px]" />
                  </div>
                  <div className="space-y-2">
                    <Label>Target Date (Optional)</Label>
                    <Controller control={goalForm.control} name="targetDate" render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} className="bg-background" />} />
                  </div>
                  <DialogFooter className="mt-4">
                    <Button type="submit" disabled={createGoalMutation.isPending}>Add Goal</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

          </CardHeader>
          <CardContent className="p-4 overflow-y-auto flex-1 space-y-3">
            {(!goals || goals.length === 0) ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-border/50 rounded-xl bg-background/50">
                <Target className="w-10 h-10 text-text-muted/40 mb-3" />
                <p className="text-text-muted">No goals set yet.</p>
                <p className="text-xs text-text-muted mt-1">Add goals to track your performance.</p>
              </div>
            ) : (
              goals.map((goal) => (
                <div key={goal.id} className="p-4 rounded-xl border border-border bg-background hover:border-primary/30 transition-all group">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{getStatusIcon(goal.status)}</div>
                      <div>
                        <h4 className="font-medium text-text group-hover:text-primary transition-colors">{goal.title}</h4>
                        {goal.description && <p className="text-sm text-text-muted mt-1 line-clamp-2">{goal.description}</p>}
                      </div>
                    </div>
                    
                    <Dialog open={selectedGoal?.id === goal.id} onOpenChange={(open) => !open && setSelectedGoal(null)}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => setSelectedGoal(goal)} className="h-8 w-8 text-text-muted hover:text-primary">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-surface border-border/50">
                        <DialogHeader>
                          <DialogTitle>Update Progress</DialogTitle>
                          <DialogDescription>{goal.title}</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={onUpdateProgress} className="space-y-6 mt-4">
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <Label>Current Progress</Label>
                              <span className="text-primary font-bold">{goal.progress}%</span>
                            </div>
                            <input 
                              id="progressSlider"
                              type="range" 
                              min="0" max="100" 
                              defaultValue={goal.progress}
                              className="w-full accent-primary h-2 bg-border rounded-lg appearance-none cursor-pointer"
                              onChange={(e) => {
                                const val = document.getElementById('progressValue');
                                if (val) val.innerText = `${e.target.value}%`;
                              }}
                            />
                            <div className="text-center text-2xl font-display font-bold text-text" id="progressValue">
                              {goal.progress}%
                            </div>
                          </div>
                          <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setSelectedGoal(null)}>Cancel</Button>
                            <Button type="submit" disabled={updateProgressMutation.isPending}>Save Progress</Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>

                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${goal.progress === 100 ? 'bg-emerald-500' : 'bg-primary'}`} 
                        style={{ width: `${goal.progress}%` }} 
                      />
                    </div>
                    <span className="text-xs font-medium text-text-muted w-8 text-right">{goal.progress}%</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Self-Review Section */}
        <Card className="bg-surface border-border h-[600px] flex flex-col">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-lg">Self-Evaluation</CardTitle>
            <CardDescription>Submit your self-review for HR evaluation</CardDescription>
          </CardHeader>
          <CardContent className="p-6 overflow-y-auto flex-1">
            {review?.status === 'SELF_REVIEW_PENDING' ? (
              <form onSubmit={reviewForm.handleSubmit(onSubmitReview as any)} className="space-y-4">
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg mb-6">
                  <p className="text-sm text-text-muted">
                    Take time to reflect on your goals and overall performance this cycle. This review will be sent to your manager/HR for final evaluation.
                  </p>
                </div>
                
                <div className="space-y-3">
                  <Label className="text-base font-medium">Self Rating (1-5)</Label>
                  <div className="flex items-center gap-4 bg-background p-3 rounded-lg border border-border/50">
                    <Input 
                      type="range" 
                      min="1" max="5" step="0.5" 
                      {...reviewForm.register('selfRating')} 
                      className="flex-1 accent-amber-500"
                      onChange={(e) => {
                        reviewForm.setValue('selfRating', parseFloat(e.target.value));
                        document.getElementById('ratingDisplay')!.innerText = e.target.value;
                      }}
                    />
                    <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 font-bold text-xl border border-amber-500/20" id="ratingDisplay">
                      {reviewForm.getValues('selfRating')}
                    </div>
                  </div>
                  {reviewForm.formState.errors.selfRating && <p className="text-xs text-rose-500">{reviewForm.formState.errors.selfRating.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-medium">Performance Comments</Label>
                  <Textarea 
                    {...reviewForm.register('selfComments')} 
                    placeholder="Describe your key achievements, challenges faced, and areas for growth..." 
                    className="min-h-[160px] bg-background resize-none"
                  />
                  {reviewForm.formState.errors.selfComments && <p className="text-xs text-rose-500">{reviewForm.formState.errors.selfComments.message}</p>}
                </div>

                <Button type="submit" disabled={submitReviewMutation.isPending} className="w-full bg-primary text-white text-lg h-12">
                  Submit Self-Review
                </Button>
              </form>
            ) : review ? (
              <div className="h-full flex flex-col justify-center space-y-6">
                <div className="text-center space-y-2">
                  <div className="mx-auto w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-display text-text">Review Submitted!</h3>
                  <p className="text-text-muted">Your self-evaluation has been sent to HR.</p>
                </div>
                
                <div className="p-6 bg-background rounded-xl border border-border/50 space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b border-border/50">
                    <span className="text-text-muted font-medium">Your Rating</span>
                    <span className="text-xl font-bold text-amber-500 bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20">{review.selfRating} / 5</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-text-muted mb-2 block">Your Comments</span>
                    <p className="text-sm text-text whitespace-pre-wrap">{review.selfComments}</p>
                  </div>
                </div>

                {review.status === 'COMPLETED' && (
                  <div className="p-6 bg-primary/5 rounded-xl border border-primary/20 space-y-4">
                    <div className="flex justify-between items-center pb-4 border-b border-primary/10">
                      <span className="text-text-muted font-medium">Final HR Rating</span>
                      <span className="text-xl font-bold text-primary bg-primary/10 px-3 py-1 rounded-lg border border-primary/20">{review.finalRating} / 5</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-text-muted mb-2 block">HR Feedback</span>
                      <p className="text-sm text-text whitespace-pre-wrap">{review.hrComments}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                 <p className="text-text-muted text-center">Review records are being generated.</p>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
