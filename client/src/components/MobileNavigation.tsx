import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';
import { useNavigationState } from '@/hooks/useNavigationState';
import { navigationCategories, quickAccessItems } from '@/config/navigationConfig';
import { NavigationCategory } from '@/components/shared/NavigationCategory';
import { 
  Menu, 
  Anchor,
  X,
  Search
} from 'lucide-react';
import { CommandPalette } from '@/components/command-palette';
import { pwaManager } from '@/utils/pwa';

export function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const { toggleCategory, isExpanded } = useNavigationState({ mode: 'mobile' });

  // Close mobile menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  // Check if PWA can be installed
  const canInstall = pwaManager.canInstall();
  const isOnline = pwaManager.isDeviceOnline();

  const handleInstallPWA = async () => {
    const result = await pwaManager.showInstallPrompt();
    if (result === 'accepted') {
      setShowInstallPrompt(false);
    }
  };

  return (
    <>
      {/* Mobile Top Navigation Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <Anchor className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-lg font-semibold">ARUS Marine</h1>
              <div className="flex items-center space-x-2">
                {!isOnline && (
                  <Badge variant="destructive" className="text-xs">Offline</Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Command Palette Trigger for Mobile */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="touch-manipulation"
              onClick={() => setCommandPaletteOpen(true)}
              data-testid="mobile-search-trigger"
              aria-label="Open search"
            >
              <Search className="h-5 w-5" />
            </Button>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Hamburger Menu */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="touch-manipulation" data-testid="mobile-menu-trigger">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 p-0 flex flex-col">
                <SheetHeader className="p-6 pb-4 border-b flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Anchor className="h-6 w-6 text-blue-600" />
                      <SheetTitle>Navigation</SheetTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsOpen(false)}
                      className="h-8 w-8 p-0"
                      data-testid="button-close-navigation"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </SheetHeader>
                
                {/* Grouped Navigation */}
                <div className="flex-1 overflow-y-auto p-3" style={{ WebkitOverflowScrolling: 'touch' }}>
                  {navigationCategories.map((category) => (
                    <NavigationCategory
                      key={category.name}
                      category={category}
                      isExpanded={isExpanded(category.name)}
                      onToggle={() => toggleCategory(category.name)}
                      mode="mobile"
                      onNavigate={() => setIsOpen(false)}
                    />
                  ))}
                </div>
                
                {/* PWA Install Section */}
                {canInstall && (
                  <div className="p-4 border-t flex-shrink-0">
                    <Button 
                      onClick={handleInstallPWA}
                      className="w-full touch-manipulation"
                      variant="outline"
                    >
                      📱 Install App
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Install for offline access and better performance
                    </p>
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Bottom Navigation for Mobile - Quick Access */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t lg:hidden">
        <div className="grid grid-cols-4 gap-1 p-2">
          {quickAccessItems.map((item) => {
            const isActive = item.href === '/' ? location === '/' : location.startsWith(item.href);
            const Icon = item.icon;
            
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className="flex flex-col items-center justify-center h-16 w-full touch-manipulation px-1"
                  size="sm"
                  data-testid={`bottom-nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <Icon className="h-5 w-5 mb-1 flex-shrink-0" />
                  <span className="text-xs leading-tight text-center line-clamp-1">{item.name}</span>
                </Button>
              </Link>
            );
          })}
        </div>
      </div>

      {/* PWA Install Prompt Modal */}
      {showInstallPrompt && canInstall && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 lg:hidden">
          <div className="bg-background rounded-lg p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Install ARUS Marine</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowInstallPrompt(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Install the ARUS Marine app for:
            </p>
            <ul className="text-sm space-y-1 mb-6">
              <li>• Offline access to critical data</li>
              <li>• Faster performance</li>
              <li>• Push notifications</li>
              <li>• Desktop-like experience</li>
            </ul>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                onClick={handleInstallPWA}
                className="w-full touch-manipulation min-h-[44px]"
              >
                Install App
              </Button>
              <Button 
                variant="outline"
                onClick={() => setShowInstallPrompt(false)}
                className="w-full touch-manipulation min-h-[44px]"
              >
                Maybe Later
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Command Palette - Mobile accessible */}
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
    </>
  );
}