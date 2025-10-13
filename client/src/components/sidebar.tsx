import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { CommandPalette } from "@/components/command-palette";
import { ConflictResolutionModal } from "@/components/ConflictResolutionModal";
import { usePendingConflicts } from "@/hooks/useConflictResolution";
import { useNavigationState } from "@/hooks/useNavigationState";
import { navigationCategories } from "@/config/navigationConfig";
import { NavigationCategory } from "@/components/shared/NavigationCategory";
import { 
  Anchor,
  Menu,
  X,
  GitMerge,
} from "lucide-react";

export function Sidebar() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const { toggleCategory, isExpanded } = useNavigationState({ mode: 'desktop' });
  
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
        {navigationCategories.map((category) => (
          <NavigationCategory
            key={category.name}
            category={category}
            isExpanded={isExpanded(category.name)}
            onToggle={() => toggleCategory(category.name)}
            mode="desktop"
          />
        ))}
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
