import { useState } from 'react';
import { Plus, BarChart3, Users, Clock, CheckCircle2, MoreVertical, Search, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAllSurveys, useCreateSurvey, useSurveyResponses } from '../api/use-surveys';

export function AdminSurveysPage() {
  const { data: surveys, isLoading } = useAllSurveys();
  const createMutation = useCreateSurvey();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', expiresAt: '' });
  const [questions, setQuestions] = useState([{ type: 'RATING', text: '', options: [] as string[] }]);
  
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);
  const { data: responses } = useSurveyResponses(selectedSurveyId || '');

  const handleAddQuestion = () => {
    setQuestions([...questions, { type: 'RATING', text: '', options: [] }]);
  };

  const handleUpdateQuestion = (index: number, field: string, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const handleRemoveQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || questions.some(q => !q.text)) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    
    try {
      await createMutation.mutateAsync({
        ...form,
        questions,
      });
      toast({ title: 'Survey created successfully' });
      setCreateOpen(false);
      setForm({ title: '', description: '', expiresAt: '' });
      setQuestions([{ type: 'RATING', text: '', options: [] }]);
    } catch {
      toast({ title: 'Failed to create survey', variant: 'destructive' });
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-text">Surveys & Feedback</h1>
          <p className="text-text-muted mt-1">Create surveys and analyze employee feedback</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-primary text-white">
          <Plus className="w-4 h-4 mr-2" />
          Create Survey
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Survey List */}
        <Card className="lg:col-span-1 flex flex-col bg-surface border-border/50 overflow-hidden">
          <div className="p-4 border-b border-border/50 font-semibold text-text">All Surveys</div>
          <div className="overflow-y-auto flex-1 p-2 space-y-2">
            {isLoading ? (
              <p className="p-4 text-center text-text-muted text-sm">Loading surveys...</p>
            ) : !surveys || surveys.length === 0 ? (
              <div className="p-8 text-center text-text-muted text-sm flex flex-col items-center">
                <FileText className="w-10 h-10 mb-3 opacity-30" />
                No surveys found
              </div>
            ) : (
              surveys.map((survey: any) => (
                <div
                  key={survey.id}
                  onClick={() => setSelectedSurveyId(survey.id)}
                  className={`p-4 rounded-lg cursor-pointer transition-colors border ${
                    selectedSurveyId === survey.id 
                      ? 'bg-primary/5 border-primary/30' 
                      : 'bg-background border-border/50 hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-text text-sm line-clamp-1">{survey.title}</h3>
                    {survey.isActive ? (
                      <span className="bg-emerald-500/10 text-emerald-500 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded">Active</span>
                    ) : (
                      <span className="bg-text-muted/10 text-text-muted text-[10px] uppercase font-bold px-1.5 py-0.5 rounded">Closed</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-muted">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {survey._count?.responses || 0} Responses
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(survey.createdAt), 'MMM d')}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Survey Details / Responses */}
        <Card className="lg:col-span-2 flex flex-col bg-surface border-border/50 overflow-hidden">
          {selectedSurveyId ? (
            <div className="h-full flex flex-col">
              <div className="p-5 border-b border-border/50 bg-background/50">
                <h2 className="text-xl font-semibold text-text mb-2">
                  {surveys?.find((s: any) => s.id === selectedSurveyId)?.title}
                </h2>
                <div className="flex items-center gap-4 text-sm text-text-muted">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4 text-primary" />
                    {responses?.length || 0} Total Responses
                  </span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                {!responses || responses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-text-muted opacity-60">
                    <BarChart3 className="w-16 h-16 mb-4" />
                    <p>No responses yet for this survey.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {responses.map((response: any) => (
                      <div key={response.id} className="p-4 rounded-lg border border-border/50 bg-background">
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/50">
                          <div className="font-medium text-text text-sm">
                            {response.employee.firstName} {response.employee.lastName}
                            <span className="text-text-muted ml-2 text-xs font-normal">({response.employee.department?.name})</span>
                          </div>
                          <div className="text-xs text-text-muted">
                            {format(new Date(response.submittedAt), 'MMM d, yyyy h:mm a')}
                          </div>
                        </div>
                        <div className="space-y-4">
                          {response.answers.map((answer: any, idx: number) => (
                            <div key={answer.id}>
                              <p className="text-sm font-medium text-text mb-1">{idx + 1}. {answer.question.text}</p>
                              <p className="text-sm text-text-muted pl-4 border-l-2 border-primary/30">
                                {answer.question.type === 'RATING' && <span className="text-amber-500 font-bold">{answer.numberValue} / 5</span>}
                                {answer.question.type === 'TEXT' && <span>{answer.textValue || 'No answer'}</span>}
                                {answer.question.type === 'MULTIPLE_CHOICE' && <span>{answer.optionValue || 'No option selected'}</span>}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-60">
              <BarChart3 className="w-16 h-16 text-text-muted mb-4" />
              <h3 className="text-lg font-medium text-text">Select a survey</h3>
              <p className="text-text-muted text-sm max-w-sm mt-1">
                Choose a survey from the list to view its responses and analytics.
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[600px] bg-surface border-border max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Survey</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-6 mt-2">
            <div className="space-y-4">
              <div>
                <Label>Survey Title</Label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Q3 Employee Engagement Survey"
                  className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <Label>Description (Optional)</Label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Briefly describe the purpose of this survey..."
                  className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-border/50">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-base font-semibold">Questions</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddQuestion}>
                  <Plus className="w-4 h-4 mr-1" /> Add Question
                </Button>
              </div>
              
              <div className="space-y-4">
                {questions.map((q, index) => (
                  <div key={index} className="p-4 rounded-lg border border-border bg-background space-y-3 relative">
                    <button type="button" onClick={() => handleRemoveQuestion(index)} className="absolute top-2 right-2 text-text-muted hover:text-rose-500">
                      ×
                    </button>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <Label className="text-xs">Question {index + 1}</Label>
                        <input
                          type="text"
                          required
                          value={q.text}
                          onChange={(e) => handleUpdateQuestion(index, 'text', e.target.value)}
                          placeholder="Enter question text..."
                          className="w-full mt-1 px-3 py-1.5 rounded-md border border-border bg-surface text-text text-sm focus:outline-none"
                        />
                      </div>
                      <div className="w-1/3">
                        <Label className="text-xs">Type</Label>
                        <select
                          value={q.type}
                          onChange={(e) => handleUpdateQuestion(index, 'type', e.target.value)}
                          className="w-full mt-1 px-3 py-1.5 rounded-md border border-border bg-surface text-text text-sm focus:outline-none"
                        >
                          <option value="RATING">Rating (1-5)</option>
                          <option value="TEXT">Text Answer</option>
                          <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                        </select>
                      </div>
                    </div>
                    {q.type === 'MULTIPLE_CHOICE' && (
                      <div>
                        <Label className="text-xs text-text-muted">Options (comma separated)</Label>
                        <input
                          type="text"
                          value={q.options.join(', ')}
                          onChange={(e) => handleUpdateQuestion(index, 'options', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                          placeholder="Option A, Option B, Option C"
                          className="w-full mt-1 px-3 py-1.5 rounded-md border border-border bg-surface text-text text-sm focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-primary text-white" disabled={createMutation.isPending}>
                Publish Survey
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
