import { useState } from 'react';
import { format } from 'date-fns';
import { Plus, Megaphone, Trash2, Edit3, Eye, EyeOff, AlertTriangle, Info, Bell } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { useToast } from '@/hooks/use-toast';
import {
  useAdminAnnouncements,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  useDeleteAnnouncement,
} from '../api/use-dashboard';

export function AdminAnnouncementsPage() {
  const { data: announcements, isLoading } = useAdminAnnouncements();
  const createMutation = useCreateAnnouncement();
  const updateMutation = useUpdateAnnouncement();
  const deleteMutation = useDeleteAnnouncement();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', content: '', priority: 'NORMAL', expiresAt: '' });

  const resetForm = () => {
    setForm({ title: '', content: '', priority: 'NORMAL', expiresAt: '' });
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (ann: any) => {
    setForm({
      title: ann.title,
      content: ann.content,
      priority: ann.priority,
      expiresAt: ann.expiresAt ? ann.expiresAt.slice(0, 10) : '',
    });
    setEditingId(ann.id);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          title: form.title,
          content: form.content,
          priority: form.priority,
          expiresAt: form.expiresAt || null,
        });
        toast({ title: 'Announcement updated' });
      } else {
        await createMutation.mutateAsync({
          title: form.title,
          content: form.content,
          priority: form.priority,
          expiresAt: form.expiresAt || undefined,
        });
        toast({ title: 'Announcement published!' });
      }
      setDialogOpen(false);
      resetForm();
    } catch {
      toast({ title: 'Failed to save announcement', variant: 'destructive' });
    }
  };

  const handleToggleActive = async (id: string, currentlyActive: boolean) => {
    try {
      await updateMutation.mutateAsync({ id, isActive: !currentlyActive });
      toast({ title: currentlyActive ? 'Announcement archived' : 'Announcement reactivated' });
    } catch {
      toast({ title: 'Failed to update', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this announcement?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: 'Announcement deleted' });
    } catch {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  };

  const priorityIcon = (p: string) => {
    if (p === 'URGENT') return <AlertTriangle className="w-4 h-4 text-red-500" />;
    if (p === 'INFO') return <Info className="w-4 h-4 text-blue-500" />;
    return <Bell className="w-4 h-4 text-amber-500" />;
  };

  const priorityBadge = (p: string) => {
    const colors: Record<string, string> = {
      URGENT: 'bg-red-500/10 text-red-500 border-red-500/20',
      NORMAL: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      INFO: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    };
    return (
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${colors[p] || colors.NORMAL}`}>
        {p}
      </span>
    );
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-text">Announcements</h1>
          <p className="text-text-muted mt-1">Create and manage company-wide announcements</p>
        </div>
        <Button onClick={openCreate} className="bg-primary text-white">
          <Plus className="w-4 h-4 mr-2" />
          New Announcement
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-text-muted">Loading announcements...</p>
        </div>
      ) : !announcements || announcements.length === 0 ? (
        <Card className="flex-1 flex flex-col items-center justify-center p-12 bg-surface border-border/50">
          <Megaphone className="w-12 h-12 text-text-muted/40 mb-4" />
          <p className="text-text-muted text-lg font-medium">No announcements yet</p>
          <p className="text-text-muted/70 text-sm mt-1">Create your first announcement to broadcast to all employees</p>
          <Button onClick={openCreate} className="mt-4 bg-primary text-white">
            <Plus className="w-4 h-4 mr-2" />
            Create Announcement
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {announcements.map((ann) => (
            <Card key={ann.id} className={`p-5 bg-surface border-border/50 ${!ann.isActive ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-0.5">{priorityIcon(ann.priority)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-text truncate">{ann.title}</h3>
                      {priorityBadge(ann.priority)}
                      {!ann.isActive && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-gray-500/10 text-gray-500 border-gray-500/20">
                          ARCHIVED
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-text-muted line-clamp-2">{ann.content}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                      <span>
                        By {ann.author?.employee ? `${ann.author.employee.firstName} ${ann.author.employee.lastName}` : ann.author?.email}
                      </span>
                      <span>Published {format(new Date(ann.publishedAt), 'MMM d, yyyy')}</span>
                      {ann.expiresAt && <span>Expires {format(new Date(ann.expiresAt), 'MMM d, yyyy')}</span>}
                      {ann._count && <span>{ann._count.reads} read{ann._count.reads !== 1 ? 's' : ''}</span>}
                      {ann.targetDepartment && (
                        <span className="text-primary">🎯 {ann.targetDepartment.name}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(ann)} title="Edit">
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleToggleActive(ann.id, ann.isActive)} title={ann.isActive ? 'Archive' : 'Reactivate'}>
                    {ann.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(ann.id)} className="text-error hover:bg-error/10" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[550px] bg-surface border-border">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Announcement' : 'New Announcement'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Update this announcement.' : 'This will be visible to all employees immediately.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="ann-title">Title</Label>
              <input
                id="ann-title"
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="e.g., Office Closed on Monday"
              />
            </div>
            <div>
              <Label htmlFor="ann-content">Content</Label>
              <textarea
                id="ann-content"
                required
                rows={4}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                placeholder="Write your announcement details here..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ann-priority">Priority</Label>
                <select
                  id="ann-priority"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="INFO">Info</option>
                  <option value="NORMAL">Normal</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <div>
                <Label>Expires At (Optional)</Label>
                <div className="mt-1">
                  <DatePicker 
                    value={form.expiresAt}
                    onChange={(val) => setForm({ ...form, expiresAt: val })}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-primary text-white" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingId ? 'Update' : 'Publish'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
