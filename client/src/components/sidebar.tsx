import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { CommandPalette } from "@/components/command-palette";
import { ConflictResolutionModal } from "@/components/ConflictResolutionModal";
import { usePendingConflicts } from "@/hooks/useConflictResolution";
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
  Wifi,
  Upload,
  Menu,
  X,
  ClipboardCheck,
  Sliders,
  HardDrive,
  Zap,
  Server,
  Building,
  Brain,
  Package,
  Target,
  Shield,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Cog,
  AlertCircle,
  GitMerge,
  MessageSquare,
  DollarSign
} from "lucide-react";

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
      { name: "Diagnostics", href: "/diagnostics", icon: AlertCircle },
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
      { name: "Analytics Dashboard", href: "/analytics", icon: TrendingUp },
      { name: "ML & AI Platform", href: "/ml-ai", icon: Brain },
      { name: "Model Performance", href: "/model-performance", icon: Target },
      { name: "Prediction Feedback", href: "/prediction-feedback", icon: MessageSquare },
      { name: "LLM Costs", href: "/llm-costs", icon: DollarSign },
      { name: "Reports", href: "/reports", icon: BarChart3 },
    ]
  },
  {
    name: "Configuration",
    icon: Cog,
    items: [
      { name: "System Settings", href: "/settings", icon: Settings },
      { name: "Sensor Setup", href: "/sensor-config", icon: Sliders },
      { name: "AI Sensor Optimization", href: "/sensor-optimization", icon: Brain },
      { name: "Data Management", href: "/transport-settings", icon: Wifi },
      { name: "Operating Parameters", href: "/operating-parameters", icon: Sliders },
    ]
  },
];

export function Sidebar() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(navigationCategories.map(cat => cat.name))
  );
  
  const { data } = usePendingConflicts();
  const pendingConflicts = data?.conflicts || [];
  const hasConflicts = pendingConflicts.length > 0;

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
        const menuButton = document.getElementById('mobile-menu-button');
        menuButton?.focus();
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      
      setTimeout(() => {
        const firstNavLink = document.querySelector('#mobile-sidebar a');
        (firstNavLink as HTMLElement)?.focus();
      }, 300);
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [isMobileMenuOpen]);

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryName)) {
        next.delete(categoryName);
      } else {
        next.add(categoryName);
      }
      return next;
    });
  };

  const SidebarContent = () => (
    <>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
              <Anchor className="text-sidebar-primary-foreground text-sm" size={16} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-sidebar-foreground">ARUS</h1>
              <p className="text-xs text-muted-foreground">Marine PdM System</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
        <CommandPalette />
      </div>
      
      <nav className="px-3 pb-6 flex-1 overflow-y-auto">
        {navigationCategories.map((category) => {
          const isExpanded = expandedCategories.has(category.name);
          const hasActiveItem = category.items.some(item => location === item.href);
          
          return (
            <div key={category.name} className="mb-2">
              <button
                onClick={() => toggleCategory(category.name)}
                className={cn(
                  "flex items-center justify-between w-full px-4 py-2 text-sm font-semibold rounded-md transition-colors",
                  "mx-3 my-1",
                  hasActiveItem
                    ? "text-sidebar-accent-foreground bg-sidebar-accent/50"
                    : "text-muted-foreground hover:bg-sidebar-accent/30 hover:text-sidebar-accent-foreground"
                )}
                aria-expanded={isExpanded}
                aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${category.name} section`}
                data-testid={`nav-category-${category.name.toLowerCase().replace(/\s+/g, '-')}`}
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
                <div className="mt-1 ml-3" role="group" aria-label={`${category.name} navigation items`}>
                  {category.items.map((item) => {
                    const isActive = location === item.href;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={cn(
                          "flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors",
                          "mx-3 my-0.5",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                        data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <item.icon className="w-4 h-4 mr-3" />
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      
      <div className="px-6 py-4 border-t border-sidebar-border space-y-3">
        {hasConflicts && (
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-between border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400"
            onClick={() => setConflictModalOpen(true)}
            data-testid="button-view-conflicts"
          >
            <span className="flex items-center gap-2">
              <GitMerge className="h-4 w-4" />
              Sync Conflicts
            </span>
            <Badge variant="destructive" className="ml-2" data-testid="badge-conflict-count">
              {pendingConflicts.length}
            </Badge>
          </Button>
        )}
        
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
      
      {/* Conflict Resolution Modal */}
      <ConflictResolutionModal
        open={conflictModalOpen}
        onOpenChange={setConflictModalOpen}
        conflicts={pendingConflicts}
      />
    </>
  );
}
