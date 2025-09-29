import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { 
  Menu, 
  Home, 
  Activity, 
  Wrench, 
  AlertTriangle, 
  BarChart3, 
  Settings, 
  Users, 
  Ship,
  Calendar,
  FileText,
  Anchor,
  X,
  Gauge,
  Server,
  Building,
  Heart,
  TrendingUp,
  Brain,
  Package,
  Target,
  Zap,
  CalendarCheck,
  ClipboardCheck,
  Bell,
  Sliders,
  HardDrive,
  Wifi,
  Upload,
  Shield
} from 'lucide-react';
import { pwaManager } from '@/utils/pwa';

interface NavigationItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  description?: string;
}

const navigationItems: NavigationItem[] = [
  { 
    href: '/', 
    label: 'Dashboard', 
    icon: Gauge,
    description: 'Fleet overview and system status'
  },
  { 
    href: '/devices', 
    label: 'Vessel Management', 
    icon: Ship,
    description: 'Manage vessel fleet and devices'
  },
  { 
    href: '/equipment-registry', 
    label: 'Equipment Registry', 
    icon: Server,
    description: 'Equipment database and registry'
  },
  { 
    href: '/organization-management', 
    label: 'Organization Management', 
    icon: Building,
    description: 'Manage organizational structure'
  },
  { 
    href: '/health', 
    label: 'Health Monitor', 
    icon: Heart,
    description: 'Monitor equipment health and alerts'
  },
  { 
    href: '/analytics', 
    label: 'Analytics', 
    icon: TrendingUp,
    description: 'Advanced fleet analytics'
  },
  { 
    href: '/advanced-analytics', 
    label: 'Advanced Analytics', 
    icon: Brain,
    description: 'AI-powered predictive analytics'
  },
  { 
    href: '/inventory-management', 
    label: 'Inventory Management', 
    icon: Package,
    description: 'Manage parts and inventory'
  },
  { 
    href: '/optimization-tools', 
    label: 'Optimization Tools', 
    icon: Target,
    description: 'Performance optimization tools'
  },
  { 
    href: '/pdm-pack', 
    label: 'PdM Pack v1', 
    icon: Zap,
    description: 'Predictive maintenance package'
  },
  { 
    href: '/work-orders', 
    label: 'Work Orders', 
    icon: Wrench,
    description: 'Manage maintenance tasks'
  },
  { 
    href: '/maintenance', 
    label: 'Maintenance', 
    icon: Calendar,
    description: 'Schedule and track maintenance'
  },
  { 
    href: '/crew-management', 
    label: 'Crew Management', 
    icon: Users,
    description: 'Manage crew assignments'
  },
  { 
    href: '/crew-scheduler', 
    label: 'Crew Scheduler', 
    icon: CalendarCheck,
    description: 'Schedule crew assignments'
  },
  { 
    href: '/hours-of-rest', 
    label: 'Hours of Rest', 
    icon: ClipboardCheck,
    description: 'STCW compliance tracking'
  },
  { 
    href: '/alerts', 
    label: 'Alerts', 
    icon: Bell,
    badge: '3',
    description: 'Active alerts and notifications'
  },
  { 
    href: '/reports', 
    label: 'Reports', 
    icon: FileText,
    description: 'Generate system reports'
  },
  { 
    href: '/sensor-config', 
    label: 'Sensor Config', 
    icon: Sliders,
    description: 'Configure sensor settings'
  },
  { 
    href: '/storage-settings', 
    label: 'Storage Settings', 
    icon: HardDrive,
    description: 'Data storage configuration'
  },
  { 
    href: '/transport-settings', 
    label: 'Transport Settings', 
    icon: Wifi,
    description: 'Communication transport settings'
  },
  { 
    href: '/telemetry-upload', 
    label: 'Telemetry Upload', 
    icon: Upload,
    description: 'Upload telemetry data'
  },
  { 
    href: '/system-administration', 
    label: 'System Administration', 
    icon: Shield,
    description: 'System admin and security'
  },
  { 
    href: '/settings', 
    label: 'Settings', 
    icon: Settings,
    description: 'System configuration'
  }
];

export function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  // Check if PWA can be installed
  const canInstall = pwaManager.canInstall();
  const isInstalled = pwaManager.isAppInstalled();
  const isOnline = pwaManager.isDeviceOnline();

  const handleInstallPWA = async () => {
    const result = await pwaManager.showInstallPrompt();
    if (result === 'accepted') {
      setShowInstallPrompt(false);
    }
  };

  const activeItem = navigationItems.find(item => {
    if (item.href === '/') {
      return location === '/';
    }
    return location.startsWith(item.href);
  });

  return (
    <>
      {/* Mobile Navigation Bar */}
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
                {canInstall && !showInstallPrompt && (
                  <Badge 
                    variant="secondary" 
                    className="text-xs cursor-pointer"
                    onClick={() => setShowInstallPrompt(true)}
                  >
                    Install App
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="touch-manipulation">
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
                  <div className="flex items-center space-x-2">
                    {!isOnline && (
                      <Badge variant="destructive" className="text-xs">Offline</Badge>
                    )}
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
                </div>
              </SheetHeader>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{'-webkit-overflow-scrolling': 'touch'}}>
                {navigationItems.map((item) => {
                  const isActive = item.href === '/' ? location === '/' : location.startsWith(item.href);
                  const Icon = item.icon;
                  
                  return (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        className="w-full justify-start h-auto p-4 touch-manipulation"
                        onClick={() => {
                          console.log('Navigation item clicked:', item.label);
                          setIsOpen(false);
                        }}
                        data-testid={`nav-item-${item.href.replace('/', '') || 'dashboard'}`}
                      >
                        <div className="flex items-center space-x-3 w-full">
                          <Icon className="h-5 w-5 flex-shrink-0" />
                          <div className="flex-1 text-left">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{item.label}</span>
                              {item.badge && (
                                <Badge variant="destructive" className="text-xs">
                                  {item.badge}
                                </Badge>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </Button>
                    </Link>
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

      {/* Bottom Navigation for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t lg:hidden">
        <div className="grid grid-cols-4 gap-1 p-2">
          {navigationItems.slice(0, 4).map((item) => {
            const isActive = item.href === '/' ? location === '/' : location.startsWith(item.href);
            const Icon = item.icon;
            
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className="flex flex-col items-center justify-center h-14 w-full touch-manipulation relative"
                  size="sm"
                >
                  <Icon className="h-5 w-5 mb-1" />
                  <span className="text-xs">{item.label.split(' ')[0]}</span>
                  {item.badge && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 text-xs h-4 w-4 p-0 flex items-center justify-center"
                    >
                      {item.badge}
                    </Badge>
                  )}
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

      {/* Content padding for mobile navigation */}
      <div className="pt-16 pb-20 lg:pt-0 lg:pb-0">
        {/* This div ensures content doesn't get hidden behind fixed navigation */}
      </div>
    </>
  );
}