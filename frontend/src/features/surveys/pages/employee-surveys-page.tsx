import { useState } from 'react';
import { FileText, Clock, ChevronRight, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useActiveSurveys, useSubmitSurvey } from '../api/use-surveys';

export function EmployeeSurveysPage() {
  const { data: surveys, isLoading } = useActiveSurveys();
  const submitMutation = useSubmitSurvey();
  const { toast } = useToast();

  const [selectedSurvey, setSelectedSurvey] = useState<any | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  
  const handleAnswerChange = (questionId: string, value: any, type: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        questionId,
        textValue: type === 'TEXT' ? value : null,
        numberValue: type === 'RATING' ? Number(value) : null,
        optionValue: type === 'MULTIPLE_CHOICE' ? value : null,
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSurvey) return;

    // Check if all questions are answered
    if (Object.keys(answers).length < selectedSurvey.questions.length) {
      toast({ title: 'Please answer all questions before submitting', variant: 'destructive' });
      return;
    }

    try {
      await submitMutation.mutateAsync({
        id: selectedSurvey.id,
        answers: Object.values(answers),
      });
      toast({ title: 'Survey submitted successfully! Thank you.' });
      setSelectedSurvey(null);
      setAnswers({});
    } catch {
      toast({ title: 'Failed to submit survey', variant: 'destructive' });
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-text flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-500" />
            Surveys & Feedback
          </h1>
          <p className="text-text-muted mt-1">Share your feedback to help us improve</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-text-muted text-sm">Loading active surveys...</p>
        </div>
      ) : !surveys || surveys.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <CheckCircle2 className="w-16 h-16 text-emerald-500/50 mb-4" />
          <h3 className="text-lg font-medium text-text">You're all caught up!</h3>
          <p className="text-text-muted mt-1 max-w-md">There are no pending surveys or feedback requests for you at this time.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {surveys.map((survey: any) => (
            <Card key={survey.id} className="p-5 bg-surface border-border/50 flex flex-col hover:border-primary/50 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-text">{survey.title}</h3>
                {survey.expiresAt && (
                  <span className="flex items-center text-[10px] uppercase font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    <Clock className="w-3 h-3 mr-1" />
                    Due {format(new Date(survey.expiresAt), 'MMM d')}
                  </span>
                )}
              </div>
              <p className="text-sm text-text-muted line-clamp-2 mb-4 flex-1">
                {survey.description || 'Please share your thoughts on this topic.'}
              </p>
              <Button onClick={() => setSelectedSurvey(survey)} className="w-full bg-primary/10 text-primary hover:bg-primary/20">
                Take Survey <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedSurvey} onOpenChange={(open) => !open && setSelectedSurvey(null)}>
        <DialogContent className="sm:max-w-[700px] bg-surface border-border max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">{selectedSurvey?.title}</DialogTitle>
            <p className="text-sm text-text-muted mt-1">{selectedSurvey?.description}</p>
          </DialogHeader>
          
          {selectedSurvey && (
            <form onSubmit={handleSubmit} className="space-y-6 mt-4">
              <div className="space-y-8">
                {selectedSurvey.questions?.sort((a: any, b: any) => a.order - b.order).map((q: any, index: number) => (
                  <div key={q.id} className="space-y-3">
                    <p className="font-medium text-text">
                      <span className="text-primary mr-2">{index + 1}.</span>
                      {q.text}
                      <span className="text-rose-500 ml-1">*</span>
                    </p>
                    
                    {q.type === 'RATING' && (
                      <div className="flex items-center gap-4 pl-6">
                        {[1, 2, 3, 4, 5].map(rating => (
                          <label key={rating} className="flex flex-col items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name={`question-${q.id}`}
                              value={rating}
                              required
                              onChange={(e) => handleAnswerChange(q.id, e.target.value, q.type)}
                              className="w-5 h-5 text-primary focus:ring-primary/30"
                            />
                            <span className="text-xs text-text-muted">{rating}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {q.type === 'MULTIPLE_CHOICE' && (
                      <div className="space-y-2 pl-6">
                        {q.options?.map((opt: string, i: number) => (
                          <label key={i} className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-background transition-colors border border-transparent hover:border-border/50">
                            <input
                              type="radio"
                              name={`question-${q.id}`}
                              value={opt}
                              required
                              onChange={(e) => handleAnswerChange(q.id, e.target.value, q.type)}
                              className="w-4 h-4 text-primary focus:ring-primary/30"
                            />
                            <span className="text-sm text-text">{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {q.type === 'TEXT' && (
                      <div className="pl-6">
                        <textarea
                          rows={3}
                          required
                          onChange={(e) => handleAnswerChange(q.id, e.target.value, q.type)}
                          placeholder="Type your answer here..."
                          className="w-full px-3 py-2 rounded-md border border-border bg-background text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-border/50">
                <Button type="button" variant="ghost" onClick={() => setSelectedSurvey(null)}>Cancel</Button>
                <Button type="submit" className="bg-primary text-white" disabled={submitMutation.isPending}>
                  Submit Answers
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
