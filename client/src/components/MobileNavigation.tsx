import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';
import { 
  Menu, 
  Anchor,
  X,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Ship,
  Wrench,
  Users,
  BarChart3,
  Cog,
  Gauge,
  Bell,
  Server,
  Heart,
  Calendar,
  Zap,
  Package,
  Target,
  CalendarCheck,
  ClipboardCheck,
  TrendingUp,
  Brain,
  FileText,
  Sliders,
  Settings,
  Wifi,
  HardDrive,
  Upload,
  Building,
  Shield,
  Search
} from 'lucide-react';
import { CommandPalette } from '@/components/command-palette';
import { pwaManager } from '@/utils/pwa';

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
}

interface NavigationCategory {
  name: string;
  icon: any;
  items: NavigationItem[];
}

const navigationCategories: NavigationCategory[] = [
  {
    name: "Operations",
    icon: LayoutDashboard,
    items: [
      { name: "Dashboard", href: "/", icon: Gauge },
      { name: "Alerts", href: "/alerts", icon: Bell },
    ]
  },
  {
    name: "Fleet Management",
    icon: Ship,
    items: [
      { name: "Vessel Management", href: "/vessel-management", icon: Ship },
      { name: "Equipment Registry", href: "/equipment-registry", icon: Server },
      { name: "Health Monitor", href: "/health", icon: Heart },
    ]
  },
  {
    name: "Maintenance",
    icon: Wrench,
    items: [
      { name: "Work Orders", href: "/work-orders", icon: Wrench },
      { name: "Maintenance Schedules", href: "/maintenance", icon: Calendar },
      { name: "PdM Pack", href: "/pdm-pack", icon: Zap },
      { name: "Inventory Management", href: "/inventory-management", icon: Package },
      { name: "Optimization Tools", href: "/optimization-tools", icon: Target },
    ]
  },
  {
    name: "Crew Operations",
    icon: Users,
    items: [
      { name: "Crew Management", href: "/crew-management", icon: Users },
      { name: "Crew Scheduler", href: "/crew-scheduler", icon: CalendarCheck },
      { name: "Hours of Rest", href: "/hours-of-rest", icon: ClipboardCheck },
    ]
  },
  {
    name: "Analytics & Reports",
    icon: BarChart3,
    items: [
      { name: "Analytics", href: "/analytics", icon: TrendingUp },
      { name: "Advanced Analytics", href: "/advanced-analytics", icon: Brain },
      { name: "Reports", href: "/reports", icon: FileText },
    ]
  },
  {
    name: "Configuration",
    icon: Cog,
    items: [
      { name: "Sensor Config", href: "/sensor-config", icon: Sliders },
      { name: "Sensor Management", href: "/sensor-management", icon: Settings },
      { name: "Transport Settings", href: "/transport-settings", icon: Wifi },
      { name: "Storage Settings", href: "/storage-settings", icon: HardDrive },
      { name: "Telemetry Upload", href: "/telemetry-upload", icon: Upload },
      { name: "Organization Management", href: "/organization-management", icon: Building },
      { name: "System Administration", href: "/system-administration", icon: Shield },
      { name: "Settings", href: "/settings", icon: Settings },
    ]
  },
];

export function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // Close mobile menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('arus-mobile-collapsed-groups');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCollapsedCategories(new Set(parsed));
      } catch (e) {
        console.error('Failed to parse mobile collapsed groups', e);
      }
    }
  }, []);

  const toggleCategory = (categoryName: string) => {
    const newCollapsed = new Set(collapsedCategories);
    if (newCollapsed.has(categoryName)) {
      newCollapsed.delete(categoryName);
    } else {
      newCollapsed.add(categoryName);
    }
    setCollapsedCategories(newCollapsed);
    localStorage.setItem('arus-mobile-collapsed-groups', JSON.stringify([...newCollapsed]));
  };

  // Check if PWA can be installed
  const canInstall = pwaManager.canInstall();
  const isOnline = pwaManager.isDeviceOnline();

  const handleInstallPWA = async () => {
    const result = await pwaManager.showInstallPrompt();
    if (result === 'accepted') {
      setShowInstallPrompt(false);
    }
  };

  // Get quick access items for bottom nav
  const quickAccessItems = [
    { name: "Dashboard", href: "/", icon: Gauge },
    { name: "Vessels", href: "/vessel-management", icon: Ship },
    { name: "Work Orders", href: "/work-orders", icon: Wrench },
    { name: "Health", href: "/health", icon: Heart },
  ];

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
                  {navigationCategories.map((category) => {
                    const isExpanded = !collapsedCategories.has(category.name);
                    const hasActiveItem = category.items.some(item => location === item.href);
                    
                    return (
                      <div key={category.name} className="mb-2">
                        <button
                          onClick={() => toggleCategory(category.name)}
                          className={`flex items-center justify-between w-full px-4 py-2.5 text-sm font-semibold rounded-md transition-colors touch-manipulation ${
                            hasActiveItem
                              ? "text-foreground bg-accent/50"
                              : "text-muted-foreground hover:bg-accent/30 hover:text-foreground"
                          }`}
                          aria-expanded={isExpanded}
                          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${category.name} section`}
                          data-testid={`mobile-nav-category-${category.name.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          <div className="flex items-center">
                            <category.icon className="w-4 h-4 mr-2" />
                            <span>{category.name}</span>
                          </div>
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                        
                        {isExpanded && (
                          <div className="mt-1 ml-2" role="group" aria-label={`${category.name} navigation items`}>
                            {category.items.map((item) => {
                              const isActive = location === item.href;
                              const Icon = item.icon;
                              
                              return (
                                <Link key={item.href} href={item.href}>
                                  <Button
                                    variant={isActive ? "secondary" : "ghost"}
                                    className="w-full justify-start px-4 py-2.5 touch-manipulation"
                                    onClick={() => setIsOpen(false)}
                                    data-testid={`mobile-nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                                  >
                                    <Icon className="h-4 w-4 mr-3" />
                                    <span className="text-sm">{item.name}</span>
                                  </Button>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
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
                  className="flex flex-col items-center justify-center h-14 w-full touch-manipulation"
                  size="sm"
                  data-testid={`bottom-nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <Icon className="h-5 w-5 mb-1" />
                  <span className="text-xs">{item.name}</span>
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
            <div className="flex space-x-2">
              <Button 
                onClick={handleInstallPWA}
                className="flex-1 touch-manipulation"
              >
                Install
              </Button>
              <Button 
                variant="outline"
                onClick={() => setShowInstallPrompt(false)}
                className="flex-1 touch-manipulation"
              >
                Later
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