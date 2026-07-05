import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Award, Loader2 } from 'lucide-react';
import { useBadges, useSendRecognition } from '../api/use-recognition';
import { useEmployeeDirectory } from '@/features/employees/api/use-employees';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function GiveRecognitionDialog({ children }: { children?: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [receiverId, setReceiverId] = useState('');
  const [badgeId, setBadgeId] = useState('');
  const [message, setMessage] = useState('');

  const { data: badgesData } = useBadges();
  const { data: directoryData } = useEmployeeDirectory();
  const employees = directoryData?.data || [];
  const sendMutation = useSendRecognition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiverId || !badgeId || !message) return;

    sendMutation.mutate(
      { receiverId, badgeId, message },
      {
        onSuccess: () => {
          setIsOpen(false);
          setReceiverId('');
          setBadgeId('');
          setMessage('');
        },
      }
    );
  };

  const badges = badgesData || [];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Award className="w-4 h-4 mr-2" /> Give a Shoutout
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Give Recognition</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Who do you want to recognize?</Label>
            <Select value={receiverId} onValueChange={setReceiverId}>
              <SelectTrigger className="bg-surface-offset border-border">
                <SelectValue placeholder="Select an employee" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {!employees || employees.length === 0 ? (
                  <div className="p-3 text-sm text-text-muted text-center">No employees found</div>
                ) : (
                  employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={emp.profilePhotoUrl || undefined} />
                          <AvatarFallback className="text-[10px]">{emp.firstName[0]}</AvatarFallback>
                        </Avatar>
                        {emp.firstName} {emp.lastName}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Select a Badge</Label>
            {badges.length === 0 ? (
              <div className="p-4 bg-muted/30 border border-border rounded-lg text-sm text-text-muted text-center">
                No badges available. An administrator needs to create badges first.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {badges.map((badge: any) => (
                  <div
                    key={badge.id}
                    onClick={() => setBadgeId(badge.id)}
                    className={`border rounded-lg p-3 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                      badgeId === badge.id ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-bg hover:bg-surface-offset'
                    }`}
                  >
                    <span className="text-2xl mb-1">{badge.icon}</span>
                    <span className="text-xs text-center font-medium line-clamp-1">{badge.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Why are they awesome?"
              className="resize-none bg-surface-offset border-border"
              rows={3}
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!receiverId || !badgeId || !message || sendMutation.isPending}>
              {sendMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send Recognition
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
