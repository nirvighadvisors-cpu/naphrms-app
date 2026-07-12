import { Bell, Menu, Check } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNotifications, useUnreadCount, useMarkAsRead } from '@/features/notifications/api/use-notifications';
import { usePushNotifications } from '@/features/notifications/hooks/use-push';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

interface TopBarProps {
  onMenuClick?: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { user } = useAuthStore();
  const { data: unreadData } = useUnreadCount();
  const { data: notifData } = useNotifications({ limit: 5 });
  const markAsRead = useMarkAsRead();
  const unreadCount = unreadData?.count || 0;
  const recentNotifications = notifData?.data || [];
  const { isSupported, permission, isLoading, subscribeToPush } = usePushNotifications();

  const initials = user?.firstName && user?.lastName 
    ? `${user.firstName[0]}${user.lastName[0]}`
    : user?.role === 'HR_ADMIN' ? 'HR' : 'EM';

  return (
    <>
      <header className="h-14 sm:h-16 bg-surface border-b border-border flex items-center justify-between px-3 sm:px-4 lg:px-8 sticky top-0 z-30 safe-top">
        {/* Left side: hamburger */}
        <div className="flex items-center flex-1 min-w-0">
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden mr-1 sm:mr-2 flex-shrink-0"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* Right side: actions */}
        <div className="flex items-center gap-1 sm:gap-2 md:gap-4 flex-shrink-0">
          
          {/* Push Notification Opt-in */}
          {isSupported && permission === 'default' && (
            <Button
              variant="outline"
              size="sm"
              onClick={subscribeToPush}
              disabled={isLoading}
              className="flex text-xs h-8 border-primary/30 text-primary hover:bg-primary hover:text-white transition-colors"
            >
              <Bell className="h-3 w-3 mr-1.5" />
              <span className="hidden sm:inline">{isLoading ? 'Enabling...' : 'Enable Notifications'}</span>
              <span className="sm:hidden">{isLoading ? '...' : 'Notify'}</span>
            </Button>
          )}

          {/* Notifications Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative text-text-muted hover:text-text flex-shrink-0">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1.5 h-2.5 w-2.5 bg-error rounded-full ring-2 ring-surface" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[calc(100vw-2rem)] sm:w-80 max-w-80 p-0">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                <h4 className="font-semibold text-sm">Notifications</h4>
                {unreadCount > 0 && (
                  <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              
              <div className="max-h-[60vh] sm:max-h-[300px] overflow-y-auto divide-y divide-border/50 scroll-touch">
                {recentNotifications.length === 0 ? (
                  <div className="py-8 text-center text-sm text-text-muted">
                    No notifications yet
                  </div>
                ) : (
                  recentNotifications.map(notification => {
                    const content = (
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <p className={`text-sm font-medium flex-1 min-w-0 ${!notification.isRead ? 'text-text' : 'text-text-muted'}`}>
                          {notification.title}
                        </p>
                        <span className="text-[10px] text-text-muted whitespace-nowrap flex-shrink-0">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    );

                    const body = (
                      <>
                        {content}
                        <p className={`text-xs ${!notification.isRead ? 'text-text-muted' : 'text-text-muted/70'} line-clamp-2`}>
                          {notification.message}
                        </p>
                        
                        {!notification.isRead && (
                          <div className="mt-2 flex justify-end">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                markAsRead.mutate(notification.id);
                              }}
                              className="text-[10px] font-medium text-primary hover:underline flex items-center"
                              data-compact
                            >
                              <Check className="w-3 h-3 mr-1" /> Mark as read
                            </button>
                          </div>
                        )}
                      </>
                    );

                    const className = `p-3 sm:p-4 transition-colors hover:bg-surface-offset block ${
                      !notification.isRead ? 'bg-primary/5' : ''
                    }`;

                    return notification.linkUrl ? (
                      <Link 
                        key={notification.id} 
                        to={notification.linkUrl}
                        className={className}
                        onClick={() => {
                          if (!notification.isRead) markAsRead.mutate(notification.id);
                        }}
                      >
                        {body}
                      </Link>
                    ) : (
                      <div key={notification.id} className={className}>
                        {body}
                      </div>
                    );
                  })
                )}
              </div>
              
              <div className="p-2 border-t border-border/50">
                <Button variant="ghost" className="w-full text-xs h-8" asChild>
                  <Link to="/employee/notifications">View all notifications</Link>
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Divider — hide on very small screens */}
          <div className="hidden sm:block h-6 w-px bg-border mx-1" />

          {/* User info + Avatar */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-medium leading-none truncate max-w-[150px]">
                {user?.firstName ? `${user.firstName} ${user.lastName}` : user?.email}
              </span>
              <span className="text-xs text-text-muted mt-1">
                {user?.role === 'HR_ADMIN' ? 'HR Admin' : 'Employee'}
              </span>
            </div>
            <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border border-border flex-shrink-0">
              <AvatarImage src={user?.profilePhotoUrl} alt="Avatar" />
              <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs sm:text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

    </>
  );
}
