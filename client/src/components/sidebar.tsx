import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Gauge, 
  Ship, 
  Heart, 
  Wrench, 
  BarChart3, 
  Settings,
  Anchor,
  TrendingUp,
  Bell,
  Calendar,
  CalendarCheck,
  Users,
  UserCog,
  Wifi,
  Upload,
  Menu,
  X,
  ClipboardCheck,
  Sliders,
  HardDrive,
  Zap,
  Server,
  Building
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: Gauge },
  { name: "Vessel Management", href: "/devices", icon: Ship },
  { name: "Equipment Registry", href: "/equipment-registry", icon: Server },
  { name: "Organization Management", href: "/organization-management", icon: Building },
  { name: "Health Monitor", href: "/health", icon: Heart },
  { name: "Analytics", href: "/analytics", icon: TrendingUp },
  { name: "PdM Pack v1", href: "/pdm-pack", icon: Zap },
  { name: "Work Orders", href: "/work-orders", icon: Wrench },
  { name: "Maintenance", href: "/maintenance", icon: Calendar },
  { name: "Crew Management", href: "/crew-management", icon: Users },
  { name: "Crew Scheduler", href: "/crew-scheduler", icon: CalendarCheck },
  { name: "Hours of Rest", href: "/hours-of-rest", icon: ClipboardCheck },
  { name: "Alerts", href: "/alerts", icon: Bell },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Sensor Config", href: "/sensor-config", icon: Sliders },
  { name: "Storage Settings", href: "/storage-settings", icon: HardDrive },
  { name: "Transport Settings", href: "/transport-settings", icon: Wifi },
  { name: "Telemetry Upload", href: "/telemetry-upload", icon: Upload },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  // Close mobile menu when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById('mobile-sidebar');
      const menuButton = document.getElementById('mobile-menu-button');
      if (sidebar && !sidebar.contains(event.target as Node) && 
          menuButton && !menuButton.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
        // Return focus to the toggle button
        const menuButton = document.getElementById('mobile-menu-button');
        menuButton?.focus();
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when mobile menu is open
      document.body.style.overflow = 'hidden';
      
      // Focus first navigation link when menu opens
      setTimeout(() => {
        const firstNavLink = document.querySelector('#mobile-sidebar a');
        (firstNavLink as HTMLElement)?.focus();
      }, 300); // Wait for transition
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [isMobileMenuOpen]);

  const SidebarContent = () => (
    <>
      <div className="p-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
            <Anchor className="text-sidebar-primary-foreground text-sm" size={16} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground">ARUS</h1>
            <p className="text-xs text-muted-foreground">Marine PdM System</p>
          </div>
        </div>
      </div>
      
      <nav className="px-3 pb-6">
        {navigation.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors",
                "mx-3 my-1",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
              data-testid={`nav-${item.name.toLowerCase().replace(" ", "-")}`}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      
      <div className="px-6 py-4 border-t border-sidebar-border mt-auto">
        <div className="flex items-center text-sm text-muted-foreground">
          <div className="status-indicator status-healthy"></div>
          <span>System Healthy</span>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          Last updated: 2 min ago
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50 safe-top safe-left">
        <Button
          id="mobile-menu-button"
          variant="outline"
          size="sm"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="bg-background/90 backdrop-blur-sm"
          data-testid="mobile-menu-toggle"
          aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-sidebar"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 bg-sidebar border-r border-sidebar-border flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside 
        id="mobile-sidebar"
        role="navigation"
        aria-label="Mobile navigation menu"
        className={cn(
          "lg:hidden fixed top-0 left-0 z-50 w-64 h-full bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 ease-in-out",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
