import {
  Gauge,
  Ship,
  Heart,
  Wrench,
  BarChart3,
  Settings,
  Bell,
  Server,
  AlertCircle,
  Calendar,
  Zap,
  Package,
  Target,
  Users,
  CalendarCheck,
  ClipboardCheck,
  TrendingUp,
  Brain,
  MessageSquare,
  DollarSign,
  Sliders,
  Wifi,
  LayoutDashboard,
  Cog,
  type LucideIcon
} from "lucide-react";

export interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

export interface NavigationCategory {
  name: string;
  icon: LucideIcon;
  items: NavigationItem[];
}

export const navigationCategories: NavigationCategory[] = [
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

export const quickAccessItems: NavigationItem[] = [
  { name: "Dashboard", href: "/", icon: Gauge },
  { name: "Vessels", href: "/vessel-management", icon: Ship },
  { name: "Work Orders", href: "/work-orders", icon: Wrench },
  { name: "Health", href: "/health", icon: Heart },
];
