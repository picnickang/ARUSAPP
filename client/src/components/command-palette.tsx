import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Gauge,
  Ship,
  Server,
  Heart,
  Wrench,
  Calendar,
  Users,
  Bell,
  BarChart3,
  Settings,
  Search,
  Plus,
  FileText,
} from "lucide-react";

interface CommandItem {
  title: string;
  href?: string;
  action?: () => void;
  icon: any;
  group: string;
}

interface CommandPaletteProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CommandPalette({ open: externalOpen, onOpenChange }: CommandPaletteProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [, setLocation] = useLocation();

  // Use external state if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [setOpen]);

  const commands: CommandItem[] = [
    {
      title: "Dashboard",
      href: "/",
      icon: Gauge,
      group: "Pages",
    },
    {
      title: "Vessels",
      href: "/vessel-management",
      icon: Ship,
      group: "Pages",
    },
    {
      title: "Equipment",
      href: "/equipment-registry",
      icon: Server,
      group: "Pages",
    },
    {
      title: "Health Monitor",
      href: "/health",
      icon: Heart,
      group: "Pages",
    },
    {
      title: "Work Orders",
      href: "/work-orders",
      icon: Wrench,
      group: "Pages",
    },
    {
      title: "Maintenance",
      href: "/maintenance",
      icon: Calendar,
      group: "Pages",
    },
    {
      title: "Crew Management",
      href: "/crew-management",
      icon: Users,
      group: "Pages",
    },
    {
      title: "Alerts",
      href: "/alerts",
      icon: Bell,
      group: "Pages",
    },
    {
      title: "Analytics",
      href: "/analytics",
      icon: BarChart3,
      group: "Pages",
    },
    {
      title: "Reports",
      href: "/reports",
      icon: FileText,
      group: "Pages",
    },
    {
      title: "Settings",
      href: "/settings",
      icon: Settings,
      group: "Pages",
    },
    {
      title: "Create Work Order",
      href: "/work-orders",
      icon: Plus,
      group: "Quick Actions",
    },
    {
      title: "Add Vessel",
      href: "/vessel-management",
      icon: Plus,
      group: "Quick Actions",
    },
  ];

  const handleSelect = (item: CommandItem) => {
    setOpen(false);
    if (item.href) {
      setLocation(item.href);
    } else if (item.action) {
      item.action();
    }
  };

  const groupedCommands = commands.reduce((acc, item) => {
    if (!acc[item.group]) {
      acc[item.group] = [];
    }
    acc[item.group].push(item);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden lg:flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground border rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
        data-testid="command-palette-trigger"
      >
        <Search className="h-4 w-4" />
        <span>Quick search...</span>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {Object.entries(groupedCommands).map(([group, items]) => (
            <CommandGroup key={group} heading={group}>
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.title}
                    onSelect={() => handleSelect(item)}
                    data-testid={`command-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <span>{item.title}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
