import type { ReactNode } from 'react';
import { useState } from 'react';
import { Sidebar } from './sidebar';
import { TopBar } from './topbar';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useLocation } from 'react-router-dom';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Auto-close mobile menu on navigation
  const handleNavigation = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-bg">
      {/* Desktop Sidebar — hidden below lg */}
      <div className="hidden lg:block z-20 h-full flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar (Sheet) — visible below lg */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent 
          side="left" 
          className="p-0 w-[280px] sm:w-72 border-r-0 safe-top"
        >
          <VisuallyHidden>
            <SheetTitle>Navigation Menu</SheetTitle>
          </VisuallyHidden>
          <Sidebar onNavigate={handleNavigation} />
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar onMenuClick={() => setMobileMenuOpen(true)} />
        
        <main className="flex-1 overflow-y-auto scroll-touch p-3 sm:p-4 md:p-6 lg:p-8 scrollbar-thin">
          <div className="max-w-7xl mx-auto pb-8 sm:pb-12 safe-bottom">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
