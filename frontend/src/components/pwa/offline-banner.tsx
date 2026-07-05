import { WifiOff } from 'lucide-react';
import { usePWA } from '@/hooks/use-pwa';

export function OfflineBanner() {
  const { isOnline } = usePWA();

  if (isOnline) return null;

  return (
    <div className="bg-error text-error-foreground px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium z-50 fixed top-0 w-full animate-in slide-in-from-top-full duration-300 shadow-md">
      <WifiOff className="w-4 h-4" />
      <span>You are currently offline. Some features may be disabled.</span>
    </div>
  );
}
