import { formatDistanceToNow } from 'date-fns';
import { Bell, CheckCircle2, Clock, Check, BellRing } from 'lucide-react';
import { useNotifications, useMarkAllAsRead, useMarkAsRead } from '../api/use-notifications';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { Link } from 'react-router-dom';

export function EmployeeNotificationsPage() {
  const { data, isLoading } = useNotifications({ limit: 50 });
  const markAllAsRead = useMarkAllAsRead();
  const markAsRead = useMarkAsRead();

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const notifications = data?.data || [];
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <PageHeader
        title="Notifications"
        description="Stay updated with your latest alerts and activities"
        action={
          unreadCount > 0 ? (
            <Button variant="outline" onClick={() => markAllAsRead.mutate()} disabled={markAllAsRead.isPending}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Mark all as read
            </Button>
          ) : null
        }
      />

      {notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="w-8 h-8" />}
          title="No notifications yet"
          description="When you receive notifications, they will show up here."
        />
      ) : (
        <Card className="border-border/50 shadow-sm overflow-hidden">
          <div className="divide-y divide-border/50">
            {notifications.map((notification) => (
              <div 
                key={notification.id}
                className={`p-4 transition-colors hover:bg-surface-offset flex gap-4 ${
                  !notification.isRead ? 'bg-primary/5' : ''
                }`}
              >
                <div className="mt-1 flex-shrink-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    !notification.isRead ? 'bg-primary/20 text-primary' : 'bg-surface-offset text-text-muted'
                  }`}>
                    <BellRing className="w-5 h-5" />
                  </div>
                </div>
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-4">
                    <p className={`text-sm font-medium ${!notification.isRead ? 'text-text' : 'text-text-muted'}`}>
                      {notification.title}
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-text-muted flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </span>
                      {!notification.isRead && (
                        <Badge variant="default" className="h-5 px-1.5 text-[10px]">New</Badge>
                      )}
                    </div>
                  </div>
                  
                  <p className={`text-sm ${!notification.isRead ? 'text-text-muted' : 'text-text-muted/70'}`}>
                    {notification.message}
                  </p>

                  <div className="flex items-center gap-4 mt-2">
                    {notification.linkUrl && (
                      <Link 
                        to={notification.linkUrl} 
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        View Details
                      </Link>
                    )}
                    
                    {!notification.isRead && (
                      <button
                        onClick={() => markAsRead.mutate(notification.id)}
                        className="text-xs font-medium text-text-muted hover:text-text flex items-center"
                      >
                        <Check className="w-3 h-3 mr-1" /> Mark as read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
