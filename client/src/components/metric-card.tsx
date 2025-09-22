import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string | number;
    label: string;
    direction?: "up" | "down";
    color?: "success" | "warning" | "danger";
  };
  className?: string;
}

export function MetricCard({ title, value, icon: Icon, trend, className }: MetricCardProps) {
  const getTrendColor = () => {
    if (!trend?.color) return "text-muted-foreground";
    
    switch (trend.color) {
      case "success":
        return "text-chart-3";
      case "warning":
        return "text-chart-2";
      case "danger":
        return "text-destructive";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <Card className={cn("metric-card", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">{title}</p>
            <p className="text-2xl font-bold text-foreground mt-1" data-testid={`metric-${title.toLowerCase().replace(/\s+/g, "-")}`}>
              {value}
            </p>
          </div>
          <div className="bg-chart-3/20 p-3 rounded-lg">
            <Icon className="text-chart-3" size={20} />
          </div>
        </div>
        {trend && (
          <div className="mt-4 flex items-center text-sm">
            <span className={cn(getTrendColor())}>
              {trend.direction === "up" && "↗"} 
              {trend.direction === "down" && "↓"} 
              {trend.value}
            </span>
            <span className="text-muted-foreground ml-1">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
