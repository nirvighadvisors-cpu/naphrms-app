import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { useBadges, useCreateBadge, useUpdateBadge, useRecognitionFeed } from '../api/use-recognition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Award, Plus, Edit2, Archive, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';

export function AdminRecognitionPage() {
  const { data: badges, isLoading: badgesLoading } = useBadges(true);
  const { data: feed, isLoading: feedLoading } = useRecognitionFeed({ limit: 50 });

  return (
    <div className="space-y-6 h-full flex flex-col">
      <PageHeader 
        title="Recognition & Kudos" 
        description="Manage recognition badges and view the company-wide recognition feed."
      />

      <Tabs defaultValue="badges" className="flex-1 flex flex-col">
        <TabsList className="w-fit bg-surface border border-border">
          <TabsTrigger value="badges">Manage Badges</TabsTrigger>
          <TabsTrigger value="feed">Company Feed</TabsTrigger>
        </TabsList>

        <TabsContent value="badges" className="mt-6 space-y-6 flex-1 focus-visible:outline-none">
          <div className="flex justify-between items-center bg-surface p-4 rounded-xl border border-border shadow-sm">
            <div>
              <h3 className="font-semibold text-text">Badges Library</h3>
              <p className="text-sm text-text-muted">Configure badges that employees can send to each other.</p>
            </div>
            <BadgeDialog />
          </div>

          {badgesLoading ? (
            <p>Loading badges...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {badges?.map((badge: any) => (
                <Card key={badge.id} className={`p-5 flex flex-col ${badge.isActive ? 'bg-surface' : 'bg-surface-offset/50 opacity-60'} border-border/50`}>
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-4xl">{badge.icon}</span>
                    <BadgeDialog badge={badge} />
                  </div>
                  <h4 className="font-semibold text-text">{badge.name}</h4>
                  <p className="text-sm text-text-muted mt-1 flex-1">{badge.description}</p>
                  <div className="mt-4 pt-4 border-t border-border/50 text-xs font-medium text-text-muted">
                    {badge.isActive ? (
                      <span className="text-emerald-500">Active</span>
                    ) : (
                      <span className="flex items-center gap-1"><Archive className="w-3 h-3" /> Archived</span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="feed" className="mt-6 flex-1 focus-visible:outline-none">
          <div className="bg-surface rounded-xl border border-border p-6 h-full max-h-[800px] overflow-y-auto">
            {feedLoading ? (
              <p>Loading feed...</p>
            ) : feed?.data.length === 0 ? (
              <p className="text-text-muted">No recognition given yet.</p>
            ) : (
              <div className="space-y-4 max-w-3xl">
                {feed?.data.map((rec: any) => (
                  <div key={rec.id} className="p-4 border border-border rounded-xl bg-bg flex items-start gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={rec.receiver.profilePhotoUrl || undefined} />
                      <AvatarFallback>{rec.receiver.firstName[0]}</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text">
                        <span className="font-semibold">{rec.receiver.firstName} {rec.receiver.lastName}</span>
                        <span className="text-text-muted"> received </span>
                        <span className="font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded text-xs ml-1">
                          {rec.badge.icon} {rec.badge.name}
                        </span>
                      </p>
                      <div className="mt-2 text-sm text-text bg-surface p-3 rounded-lg border border-border/50">
                        "{rec.message}"
                      </div>
                      <p className="mt-2 text-xs text-text-muted flex items-center gap-1">
                        From <span className="font-medium">{rec.sender.firstName} {rec.sender.lastName}</span> • {formatDistanceToNow(new Date(rec.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BadgeDialog({ badge }: { badge?: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(badge?.name || '');
  const [icon, setIcon] = useState(badge?.icon || '🏆');
  const [description, setDescription] = useState(badge?.description || '');
  const [isActive, setIsActive] = useState(badge ? badge.isActive : true);

  const createMutation = useCreateBadge();
  const updateMutation = useUpdateBadge();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (badge) {
      updateMutation.mutate({ id: badge.id, data: { name, icon, description, isActive } }, { onSuccess: () => setIsOpen(false) });
    } else {
      createMutation.mutate({ name, icon, description }, { onSuccess: () => {
        setIsOpen(false);
        setName('');
        setIcon('🏆');
        setDescription('');
      }});
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {badge ? (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-text-muted hover:text-text"><Edit2 className="w-4 h-4" /></Button>
        ) : (
          <Button><Plus className="w-4 h-4 mr-2" /> Add Badge</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{badge ? 'Edit Badge' : 'Create New Badge'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-3 space-y-2">
              <Label>Badge Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Team Player" required />
            </div>
            <div className="col-span-1 space-y-2">
              <Label>Icon (Emoji)</Label>
              <Input value={icon} onChange={e => setIcon(e.target.value)} className="text-center text-xl" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this badge for?" />
          </div>
          {badge && (
            <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-surface">
              <div className="space-y-0.5">
                <Label>Active Status</Label>
                <p className="text-xs text-text-muted">Inactive badges cannot be sent by employees.</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          )}
          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending || !name || !icon}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Badge
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
