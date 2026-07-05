import { useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { format } from 'date-fns';
import { Plus, MessageSquare, Clock, CheckCircle2, AlertCircle, Send, X, Ticket } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  useMyTickets,
  useCreateTicket,
  useTicketDetails,
  useAddTicketComment,
} from '../api/use-tickets';

export function EmployeeTicketsPage() {
  const { user } = useAuthStore();
  const { data: tickets, isLoading } = useMyTickets();
  const createMutation = useCreateTicket();
  const commentMutation = useAddTicketComment();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ subject: '', description: '', category: 'IT_SUPPORT', priority: 'MEDIUM' });

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const { data: ticketDetails } = useTicketDetails(selectedTicketId || '');
  const [commentText, setCommentText] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync(form);
      toast({ title: 'Ticket raised successfully' });
      setCreateOpen(false);
      setForm({ subject: '', description: '', category: 'IT_SUPPORT', priority: 'MEDIUM' });
    } catch {
      toast({ title: 'Failed to create ticket', variant: 'destructive' });
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId || !commentText.trim()) return;
    try {
      await commentMutation.mutateAsync({ id: selectedTicketId, content: commentText });
      setCommentText('');
    } catch {
      toast({ title: 'Failed to add comment', variant: 'destructive' });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN': return <span className="bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded text-xs font-medium border border-amber-500/20">Open</span>;
      case 'IN_PROGRESS': return <span className="bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded text-xs font-medium border border-blue-500/20">In Progress</span>;
      case 'RESOLVED': return <span className="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded text-xs font-medium border border-emerald-500/20">Resolved</span>;
      case 'CLOSED': return <span className="bg-gray-500/10 text-gray-500 px-2 py-0.5 rounded text-xs font-medium border border-gray-500/20">Closed</span>;
      default: return null;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'LOW': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'MEDIUM': return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case 'HIGH': return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'URGENT': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-text">My Requests</h1>
          <p className="text-text-muted mt-1">Raise and track IT, HR, or Admin requests</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-primary text-white shrink-0 w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Raise Request
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Ticket List */}
        <Card className={`lg:col-span-1 flex-col bg-surface border-border/50 overflow-hidden ${selectedTicketId ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-4 border-b border-border/50 font-semibold flex items-center justify-between">
            <span>Recent Tickets</span>
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">{tickets?.length || 0}</span>
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-2">
            {isLoading ? (
              <p className="p-4 text-center text-text-muted text-sm">Loading tickets...</p>
            ) : !tickets || tickets.length === 0 ? (
              <div className="p-8 flex flex-col items-center justify-center text-center">
                <Ticket className="w-10 h-10 text-text-muted/30 mb-3" />
                <p className="text-text-muted text-sm">No tickets found</p>
                <p className="text-xs text-text-muted/70 mt-1">Click "Raise Request" to create one.</p>
              </div>
            ) : (
              tickets.map((ticket: any) => (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                    selectedTicketId === ticket.id 
                      ? 'bg-primary/5 border-primary/30' 
                      : 'bg-background border-border/50 hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getPriorityIcon(ticket.priority)}
                      <span className="font-semibold text-text text-sm line-clamp-1" title={ticket.subject}>{ticket.subject}</span>
                    </div>
                    {getStatusBadge(ticket.status)}
                  </div>
                  <div className="flex items-center justify-between text-xs text-text-muted">
                    <span>{format(new Date(ticket.createdAt), 'MMM d, h:mm a')}</span>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      <span>{ticket._count?.comments || 0}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Ticket Details */}
        <Card className={`lg:col-span-2 flex-col bg-surface border-border/50 overflow-hidden ${!selectedTicketId ? 'hidden lg:flex' : 'flex'}`}>
          {selectedTicketId && ticketDetails ? (
            <>
              {/* Header */}
              <div className="p-5 border-b border-border/50 bg-background/50">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="text-xl font-semibold text-text mb-2">{ticketDetails.subject}</h2>
                    <div className="flex items-center gap-3 text-sm text-text-muted">
                      <span className="px-2 py-0.5 bg-surface-offset rounded text-xs border border-border/50">
                        {ticketDetails.category.replace('_', ' ')}
                      </span>
                      <span>Created {format(new Date(ticketDetails.createdAt), 'MMM d, yyyy')}</span>
                      {getStatusBadge(ticketDetails.status)}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedTicketId(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="p-3 bg-surface rounded-lg border border-border/50 text-sm text-text mt-4">
                  <p className="whitespace-pre-wrap">{ticketDetails.description}</p>
                </div>
              </div>

              {/* Chat Thread */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {ticketDetails.comments?.map((comment: any) => {
                  const isMe = comment.authorId === user?.id;
                  return (
                    <div key={comment.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage src={comment.author.employee?.profilePhotoUrl} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {isMe ? 'Me' : comment.author.role === 'SUPER_ADMIN' ? 'AD' : 'HR'}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-text">
                            {isMe ? 'You' : `${comment.author.employee?.firstName || 'Admin'} (${comment.author.role.replace('_', ' ')})`}
                          </span>
                          <span className="text-[10px] text-text-muted">
                            {format(new Date(comment.createdAt), 'h:mm a')}
                          </span>
                        </div>
                        <div className={`p-3 rounded-lg text-sm ${isMe ? 'bg-primary text-white rounded-tr-none' : 'bg-surface-offset border border-border/50 text-text rounded-tl-none'}`}>
                          <p className="whitespace-pre-wrap">{comment.content}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Input Area */}
              {ticketDetails.status !== 'CLOSED' && (
                <div className="p-4 border-t border-border/50 bg-background/50">
                  <form onSubmit={handleAddComment} className="flex items-end gap-2">
                    <div className="flex-1">
                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Type your message..."
                        className="w-full resize-none rounded-lg border border-border/50 bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[80px]"
                      />
                    </div>
                    <Button type="submit" disabled={!commentText.trim() || commentMutation.isPending} className="bg-primary text-white h-10 px-4">
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <MessageSquare className="w-12 h-12 text-text-muted/20 mb-4" />
              <h3 className="text-lg font-medium text-text">Select a request</h3>
              <p className="text-text-muted text-sm max-w-sm mt-1">
                Choose a ticket from the list to view the conversation and status updates.
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[500px] bg-surface border-border">
          <DialogHeader>
            <DialogTitle>Raise a New Request</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 mt-2">
            <div>
              <Label>Category</Label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="IT_SUPPORT">IT Support (Laptops, Access, Software)</option>
                <option value="PAYROLL">Payroll (Salary, Tax, Allowances)</option>
                <option value="HR_GENERAL">HR General (Policies, Letters, Onboarding)</option>
                <option value="FACILITIES">Facilities (Desk, Maintenance, Cafeteria)</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <Label>Subject</Label>
              <input
                type="text"
                required
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Brief summary of your issue"
                className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <Label>Description</Label>
              <textarea
                required
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Provide detailed information..."
                className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>
            <div>
              <Label>Priority</Label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="LOW">Low - Not urgent</option>
                <option value="MEDIUM">Medium - Needs attention</option>
                <option value="HIGH">High - Blocking my work</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-primary text-white" disabled={createMutation.isPending}>
                Submit Request
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
