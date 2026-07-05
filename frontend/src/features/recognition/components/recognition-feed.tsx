import React from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { Award } from 'lucide-react';
import { useRecognitionFeed } from '../api/use-recognition';

export function RecognitionFeed() {
  const { data: feedData, isLoading } = useRecognitionFeed({ limit: 10 });

  if (isLoading) {
    return <div className="text-sm text-text-muted">Loading feed...</div>;
  }

  const records = feedData?.data || [];

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 border border-dashed border-border rounded-xl">
        <Award className="w-8 h-8 text-primary/40 mb-2" />
        <p className="text-sm text-text-muted">No recognition given yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {records.map((rec: any) => (
        <Card key={rec.id} className="p-4 bg-surface border-border/50 hover:bg-surface-offset transition-colors">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <Avatar className="h-10 w-10 border border-border">
                <AvatarImage src={rec.receiver.profilePhotoUrl || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {rec.receiver.firstName[0]}
                </AvatarFallback>
              </Avatar>
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text">
                <span className="font-semibold text-primary">{rec.receiver.firstName} {rec.receiver.lastName}</span>
                <span className="text-text-muted"> received </span>
                <span className="font-medium bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded text-xs ml-1 inline-flex items-center gap-1">
                  <span className="text-base leading-none">{rec.badge.icon}</span> {rec.badge.name}
                </span>
              </p>
              
              <div className="mt-2 text-sm text-text bg-bg p-3 rounded-lg border border-border/50 relative">
                <div className="absolute top-[-6px] left-4 w-3 h-3 bg-bg border-l border-t border-border/50 transform rotate-45"></div>
                "{rec.message}"
              </div>
              
              <p className="mt-3 text-xs text-text-muted flex items-center gap-1">
                From <span className="font-medium">{rec.sender.firstName}</span> • {formatDistanceToNow(new Date(rec.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
