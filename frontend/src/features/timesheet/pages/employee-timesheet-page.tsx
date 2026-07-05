import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Calendar, Save, ListTodo, History, CheckCircle2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { useMyLogs, useSubmitLog } from '../api/use-timesheet';
import { DatePicker } from '@/components/ui/date-picker';
import { Controller } from 'react-hook-form';

const logSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  content: z.string().min(10, 'Please provide more detail about your tasks (min 10 chars)'),
});

export function EmployeeTimesheetPage() {
  const [activeTab, setActiveTab] = useState<'today' | 'history'>('today');

  const { data: logs, isLoading } = useMyLogs();
  const submitMutation = useSubmitLog();

  const form = useForm<z.infer<typeof logSchema>>({
    resolver: zodResolver(logSchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      content: '',
    },
  });

  const onSubmit = (values: z.infer<typeof logSchema>) => {
    submitMutation.mutate(values, {
      onSuccess: () => {
        form.reset({ ...values, content: '' }); // keep the date
        setActiveTab('history');
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-page-title font-display text-text">Daily Activity Log</h1>
          <p className="text-text-muted">Record your daily tasks, meetings, and accomplishments.</p>
        </div>
        
        <div className="flex bg-surface border border-border rounded-lg p-1">
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'today' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text'}`}
            onClick={() => setActiveTab('today')}
          >
            <ListTodo className="w-4 h-4" /> Log Work
          </button>
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'history' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text'}`}
            onClick={() => setActiveTab('history')}
          >
            <History className="w-4 h-4" /> History
          </button>
        </div>
      </div>

      {activeTab === 'today' ? (
        <Card className="bg-surface border-border max-w-3xl">
          <CardHeader>
            <CardTitle>Submit Timesheet</CardTitle>
            <CardDescription>Use bullet points to list the tasks you worked on today.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2 max-w-[200px]">
                <Label>Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
                  <Controller control={form.control} name="date" render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} className="pl-9 bg-background" />} />
                </div>
                {form.formState.errors.date && <p className="text-xs text-rose-500">{form.formState.errors.date.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>What did you work on?</Label>
                <Textarea 
                  {...form.register('content')} 
                  className="bg-background min-h-[200px] font-mono text-sm leading-relaxed" 
                  placeholder="- Completed homepage redesign&#10;- Attended sprint planning meeting&#10;- Fixed bug #142 in the authentication flow"
                />
                {form.formState.errors.content ? (
                   <p className="text-xs text-rose-500">{form.formState.errors.content.message}</p>
                ) : (
                  <p className="text-xs text-text-muted">Markdown bullet points (-) are recommended for readability.</p>
                )}
              </div>

              <Button type="submit" disabled={submitMutation.isPending} className="w-full sm:w-auto gap-2">
                <Save className="w-4 h-4" /> Save Daily Log
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {isLoading ? (
             <p className="text-text-muted">Loading your history...</p>
          ) : !logs || logs.length === 0 ? (
             <div className="py-12 flex flex-col items-center justify-center border border-dashed border-border rounded-xl">
               <History className="w-12 h-12 text-border mb-3" />
               <h3 className="text-lg font-medium text-text">No logs found</h3>
               <p className="text-text-muted mb-4">You haven't submitted any daily activity logs yet.</p>
               <Button variant="outline" onClick={() => setActiveTab('today')}>Write your first log</Button>
             </div>
          ) : (
             <div className="grid gap-4 max-w-4xl">
               {logs.map((log) => (
                 <Card key={log.id} className="bg-surface border-border overflow-hidden">
                   <div className="flex flex-col sm:flex-row">
                     <div className="bg-primary/5 p-6 flex flex-col items-center justify-center sm:w-48 border-b sm:border-b-0 sm:border-r border-border/50 shrink-0">
                       <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
                         <Calendar className="w-6 h-6" />
                       </div>
                       <span className="font-bold text-text">{format(new Date(log.date), 'MMM d, yyyy')}</span>
                       <span className="text-xs text-text-muted mt-1">{format(new Date(log.date), 'EEEE')}</span>
                     </div>
                     <div className="p-6 flex-1">
                       <div className="flex justify-between items-start mb-4">
                         <h4 className="font-medium text-text text-sm uppercase tracking-wider">Activity Summary</h4>
                         <span className="flex items-center gap-1 text-xs text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full font-medium">
                           <CheckCircle2 className="w-3 h-3" /> Submitted
                         </span>
                       </div>
                       <div className="prose prose-sm dark:prose-invert max-w-none font-mono whitespace-pre-wrap text-text-muted leading-relaxed">
                         {log.content}
                       </div>
                     </div>
                   </div>
                 </Card>
               ))}
             </div>
          )}
        </div>
      )}
    </div>
  );
}
