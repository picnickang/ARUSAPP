import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
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
  Wifi,
  Upload
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: Gauge },
  { name: "Devices", href: "/devices", icon: Ship },
  { name: "Health Monitor", href: "/health", icon: Heart },
  { name: "Analytics", href: "/analytics", icon: TrendingUp },
  { name: "Work Orders", href: "/work-orders", icon: Wrench },
  { name: "Maintenance", href: "/maintenance", icon: Calendar },
  { name: "Alerts", href: "/alerts", icon: Bell },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Transport Settings", href: "/transport-settings", icon: Wifi },
  { name: "Telemetry Upload", href: "/telemetry-upload", icon: Upload },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-64 flex-shrink-0 bg-sidebar border-r border-sidebar-border">
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
    </aside>
  );
}
