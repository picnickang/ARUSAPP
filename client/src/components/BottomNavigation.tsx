import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { Gauge, Wrench, Bell, Menu } from 'lucide-react';
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';

interface NavItem {
  icon: React.ElementType;
  label: string;
  href?: string;
  onClick?: () => void;
}

export function BottomNavigation() {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems: NavItem[] = [
    { icon: Gauge, label: 'Dashboard', href: '/' },
    { icon: Wrench, label: 'Work Orders', href: '/work-orders' },
    { icon: Bell, label: 'Alerts', href: '/alerts' },
    { icon: Menu, label: 'More', onClick: () => setMenuOpen(true) },
  ];

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav 
        className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border z-40 md:hidden safe-bottom"
        data-testid="bottom-navigation"
      >
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map((item, index) => {
            const isActive = item.href === '/' 
              ? location === '/' 
              : location.startsWith(item.href || '');
            const Icon = item.icon;
            
            if (item.href) {
              return (
                <Link key={index} href={item.href}>
                  <a
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[64px] min-h-[48px]",
                      isActive 
                        ? "text-primary bg-primary/10" 
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                    data-testid={`bottom-nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                  >
                    <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
                    <span className="text-xs font-medium">{item.label}</span>
                  </a>
                </Link>
              );
            }

            return (
              <button
                key={index}
                onClick={item.onClick}
                className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-accent/50 min-w-[64px] min-h-[48px]"
                data-testid={`bottom-nav-${item.label.toLowerCase()}`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* More Menu Sheet */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="bottom" className="h-[60vh]">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          
          <div className="mt-6 space-y-2">
            <Link href="/inventory-management">
              <a 
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent"
                onClick={() => setMenuOpen(false)}
                data-testid="menu-link-inventory"
              >
                <span className="text-base">Inventory Management</span>
              </a>
            </Link>
            
            <Link href="/crew-scheduler">
              <a 
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent"
                onClick={() => setMenuOpen(false)}
                data-testid="menu-link-crew-scheduler"
              >
                <span className="text-base">Crew Scheduler</span>
              </a>
            </Link>
            
            <Link href="/hours-of-rest">
              <a 
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent"
                onClick={() => setMenuOpen(false)}
                data-testid="menu-link-hours-of-rest"
              >
                <span className="text-base">Hours of Rest</span>
              </a>
            </Link>
            
            <Link href="/analytics">
              <a 
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent"
                onClick={() => setMenuOpen(false)}
                data-testid="menu-link-analytics"
              >
                <span className="text-base">Analytics</span>
              </a>
            </Link>
            
            <Link href="/settings">
              <a 
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent"
                onClick={() => setMenuOpen(false)}
                data-testid="menu-link-settings"
              >
                <span className="text-base">Settings</span>
              </a>
            </Link>

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between p-3">
                <span className="text-sm text-muted-foreground">Theme</span>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
