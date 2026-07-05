import type { ReactNode } from 'react';
import { Building2, Download } from 'lucide-react';
import { usePWA } from '@/hooks/use-pwa';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  const { isInstallable, installApp } = usePWA();
  const { toast } = useToast();

  const handleInstall = async () => {
    const prompted = await installApp();
    if (!prompted) {
      toast({
        title: "Manual Installation Required",
        description: "To install this app, tap your browser menu (⋮ or Share icon) and select 'Add to Home screen' or 'Install App'.",
        duration: 8000,
      });
    }
  };

  useEffect(() => {
    if (isInstallable) {
      const lastPrompt = localStorage.getItem('pwaPromptTime_auth');
      const now = Date.now();
      if (!lastPrompt || now - parseInt(lastPrompt) > 24 * 60 * 60 * 1000) {
        setTimeout(() => {
          toast({
            title: "Install HRMS App",
            description: "Install this app on your device for a native experience!",
            action: <Button variant="outline" size="sm" onClick={handleInstall}>Install</Button>,
            duration: 10000,
          });
          localStorage.setItem('pwaPromptTime_auth', now.toString());
        }, 2000);
      }
    }
  }, [isInstallable, toast]);

  return (
    <div className="min-h-[100dvh] bg-bg flex items-center justify-center p-3 sm:p-4 relative overflow-hidden">
      {isInstallable && (
        <div className="absolute top-4 right-4 z-50">
          <Button variant="outline" size="sm" className="bg-surface border-primary/20 text-primary shadow-sm" onClick={handleInstall}>
            <Download className="w-4 h-4 mr-2" /> Install App
          </Button>
        </div>
      )}
      {/* Decorative background elements — smaller on mobile */}
      <div className="absolute top-[-10%] left-[-10%] w-48 sm:w-96 h-48 sm:h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-48 sm:w-96 h-48 sm:h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="bg-surface rounded-xl sm:rounded-2xl shadow-elevated border border-border overflow-hidden">
          <div className="p-5 sm:p-8">
            <div className="flex justify-center mb-6 sm:mb-8">
              <div className="flex items-center gap-2">
                <img src="/nap-logo.png" alt="NAP Logo" className="w-8 h-8 sm:w-9 sm:h-9 object-contain" />
                <span className="font-display font-bold text-xl sm:text-2xl tracking-tight text-text">
                  NAP <span className="text-primary font-medium">HRMS</span>
                </span>
              </div>
            </div>
            
            <div className="text-center mb-6 sm:mb-8">
              <h1 className="text-xl sm:text-2xl font-display font-bold text-text mb-1 sm:mb-2">{title}</h1>
              {subtitle && <p className="text-text-muted text-xs sm:text-sm">{subtitle}</p>}
            </div>
            
            {children}
          </div>
        </div>
        <p className="text-center text-[10px] sm:text-xs text-text-muted mt-4 sm:mt-6 px-4">
          &copy; {new Date().getFullYear()} Nirvigh Advisors Pvt.Ltd. All rights reserved.
        </p>
      </div>
    </div>
  );
}
