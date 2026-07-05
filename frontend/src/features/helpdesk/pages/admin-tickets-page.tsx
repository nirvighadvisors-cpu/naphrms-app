import { useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { format } from 'date-fns';
import { MessageSquare, Clock, CheckCircle2, AlertCircle, Send, Search, Filter, X, Ticket, Building2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  useAllTickets,
  useTicketDetails,
  useUpdateTicketStatus,
  useAssignTicket,
  useAddTicketComment,
} from '../api/use-tickets';

export function AdminTicketsPage() {
  const { user } = useAuthStore();
  const { data: tickets, isLoading } = useAllTickets();
  const updateStatusMutation = useUpdateTicketStatus();
  const assignMutation = useAssignTicket();
  const commentMutation = useAddTicketComment();
  const { toast } = useToast();

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const { data: ticketDetails } = useTicketDetails(selectedTicketId || '');
  const [commentText, setCommentText] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');

  const filteredTickets = tickets?.filter((t: any) => {
    if (filterStatus === 'ALL') return true;
    return t.status === filterStatus;
  });

  const handleUpdateStatus = async (status: string) => {
    if (!selectedTicketId) return;
    try {
      await updateStatusMutation.mutateAsync({ id: selectedTicketId, status });
      toast({ title: 'Status updated' });
    } catch {
      toast({ title: 'Failed to update status', variant: 'destructive' });
    }
  };

  const handleAssignToMe = async () => {
    if (!selectedTicketId || !user) return;
    try {
      await assignMutation.mutateAsync({ id: selectedTicketId, assignedToId: user.id });
      toast({ title: 'Ticket assigned to you' });
    } catch {
      toast({ title: 'Failed to assign ticket', variant: 'destructive' });
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId || !commentText.trim()) return;
    try {
      await commentMutation.mutateAsync({ id: selectedTicketId, content: commentText, isInternal: isInternalComment });
      setCommentText('');
      setIsInternalComment(false);
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

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'LOW': return <span className="text-blue-500 text-xs font-medium">Low</span>;
      case 'MEDIUM': return <span className="text-amber-500 text-xs font-medium">Medium</span>;
      case 'HIGH': return <span className="text-orange-500 text-xs font-medium">High</span>;
      case 'URGENT': return <span className="text-red-500 text-xs font-medium font-bold">Urgent</span>;
      default: return null;
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-text">Helpdesk Management</h1>
          <p className="text-text-muted mt-1">Manage and resolve employee requests</p>
        </div>
        <div className="flex gap-2">
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none"
          >
            <option value="ALL">All Status</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Ticket List */}
        <Card className={`lg:col-span-1 flex-col bg-surface border-border/50 overflow-hidden ${selectedTicketId ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-3 border-b border-border/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input 
                type="text" 
                placeholder="Search tickets..." 
                className="w-full pl-9 pr-3 py-2 rounded-md bg-background border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-2">
            {isLoading ? (
              <p className="p-4 text-center text-text-muted text-sm">Loading tickets...</p>
            ) : !filteredTickets || filteredTickets.length === 0 ? (
              <div className="p-8 flex flex-col items-center justify-center text-center">
                <Ticket className="w-10 h-10 text-text-muted/30 mb-3" />
                <p className="text-text-muted text-sm">No tickets found</p>
              </div>
            ) : (
              filteredTickets.map((ticket: any) => (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                    selectedTicketId === ticket.id 
                      ? 'bg-primary/5 border-primary/30' 
                      : 'bg-background border-border/50 hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-semibold text-text text-sm line-clamp-1 pr-2" title={ticket.subject}>
                      {ticket.subject}
                    </span>
                    {getStatusBadge(ticket.status)}
                  </div>
                  <div className="flex items-center gap-2 mb-2 text-xs">
                    {getPriorityBadge(ticket.priority)}
                    <span className="text-text-muted/50">•</span>
                    <span className="text-text-muted truncate">{ticket.category.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-text-muted">
                    <div className="flex items-center gap-1.5">
                      <Avatar className="w-4 h-4">
                        <AvatarImage src={ticket.employee?.profilePhotoUrl} />
                        <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                          {ticket.employee?.firstName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate max-w-[100px]">{ticket.employee?.firstName} {ticket.employee?.lastName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {ticket.assignedToId && (
                        <span title={`Assigned to ${ticket.assignedTo?.email}`}>🧑‍💻</span>
                      )}
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {ticket._count?.comments || 0}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Ticket Details */}
        <Card className={`lg:col-span-2 flex-col bg-surface border-border/50 overflow-hidden relative ${!selectedTicketId ? 'hidden lg:flex' : 'flex'}`}>
          {selectedTicketId && ticketDetails ? (
            <>
              {/* Header */}
              <div className="p-5 border-b border-border/50 bg-background/50 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-xl font-semibold text-text">{ticketDetails.subject}</h2>
                      {getPriorityBadge(ticketDetails.priority)}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-text-muted">
                      <span className="px-2 py-0.5 bg-surface-offset rounded text-xs border border-border/50">
                        {ticketDetails.category.replace('_', ' ')}
                      </span>
                      <span>Raised {format(new Date(ticketDetails.createdAt), 'MMM d, yyyy h:mm a')}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedTicketId(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Status & Assignment Actions */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-surface rounded-lg border border-border/50">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={ticketDetails.employee?.profilePhotoUrl} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {ticketDetails.employee?.firstName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-text">{ticketDetails.employee?.firstName} {ticketDetails.employee?.lastName}</p>
                      <p className="text-xs text-text-muted">{ticketDetails.employee?.employeeCode}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Assignment */}
                    <div className="flex items-center gap-2 border-r border-border/50 pr-3">
                      {ticketDetails.assignedTo ? (
                        <div className="text-sm">
                          <span className="text-text-muted text-xs mr-1">Assigned to:</span>
                          <span className="font-medium text-text">{ticketDetails.assignedTo.email === user?.email ? 'You' : ticketDetails.assignedTo.email}</span>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm" onClick={handleAssignToMe} disabled={assignMutation.isPending}>
                          Assign to Me
                        </Button>
                      )}
                    </div>

                    {/* Status Dropdown */}
                    <div className="flex items-center gap-2">
                      <span className="text-text-muted text-xs">Status:</span>
                      <select 
                        value={ticketDetails.status}
                        onChange={(e) => handleUpdateStatus(e.target.value)}
                        disabled={updateStatusMutation.isPending}
                        className="px-2 py-1 text-sm rounded border border-border bg-background font-medium"
                      >
                        <option value="OPEN">Open</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="CLOSED">Closed</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-background rounded-lg border border-border/50 text-sm text-text">
                  <p className="whitespace-pre-wrap">{ticketDetails.description}</p>
                </div>
              </div>

              {/* Chat Thread */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {ticketDetails.comments?.length === 0 && (
                  <p className="text-center text-text-muted text-sm my-4">No comments yet. Start the conversation!</p>
                )}
                {ticketDetails.comments?.map((comment: any) => {
                  const isMe = comment.authorId === user?.id;
                  const isEmployee = comment.author.role === 'EMPLOYEE';
                  
                  return (
                    <div key={comment.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage src={comment.author.employee?.profilePhotoUrl} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {isMe ? 'Me' : isEmployee ? 'EMP' : 'HR'}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-text">
                            {isMe ? 'You' : `${comment.author.employee?.firstName || comment.author.email} (${isEmployee ? 'Employee' : 'Admin'})`}
                          </span>
                          <span className="text-[10px] text-text-muted">
                            {format(new Date(comment.createdAt), 'h:mm a')}
                          </span>
                          {comment.isInternal && (
                            <span className="text-[10px] font-bold text-amber-500 uppercase px-1.5 py-0.5 bg-amber-500/10 rounded">Internal</span>
                          )}
                        </div>
                        <div className={`p-3 rounded-lg text-sm ${
                          comment.isInternal 
                            ? 'bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200'
                            : isMe 
                              ? 'bg-primary text-white rounded-tr-none' 
                              : 'bg-surface-offset border border-border/50 text-text rounded-tl-none'
                        }`}>
                          <p className="whitespace-pre-wrap">{comment.content}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-border/50 bg-background/50">
                <form onSubmit={handleAddComment} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between px-1">
                    <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={isInternalComment}
                        onChange={(e) => setIsInternalComment(e.target.checked)}
                        className="rounded border-border text-amber-500 focus:ring-amber-500"
                      />
                      <span>Internal Note (Hidden from employee)</span>
                    </label>
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder={isInternalComment ? "Type an internal note..." : "Reply to employee..."}
                        className={`w-full resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 min-h-[80px] ${
                          isInternalComment 
                            ? 'border-amber-500/50 bg-amber-500/5 focus:ring-amber-500/30 placeholder:text-amber-500/50' 
                            : 'border-border/50 bg-surface focus:ring-primary/30'
                        }`}
                      />
                    </div>
                    <Button 
                      type="submit" 
                      disabled={!commentText.trim() || commentMutation.isPending} 
                      className={`h-10 px-4 text-white ${isInternalComment ? 'bg-amber-500 hover:bg-amber-600' : 'bg-primary'}`}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {isInternalComment ? 'Add Note' : 'Send'}
                    </Button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <MessageSquare className="w-12 h-12 text-text-muted/20 mb-4" />
              <h3 className="text-lg font-medium text-text">Select a ticket</h3>
              <p className="text-text-muted text-sm max-w-sm mt-1">
                Choose a ticket from the queue to view details, assign to yourself, and respond to the employee.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
