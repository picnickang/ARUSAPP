import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
  progress?: {
    value: number; // 0-100
    color?: "default" | "success" | "warning" | "danger";
  };
  gradient?: "blue" | "green" | "purple" | "orange" | "red" | "indigo";
  variant?: "default" | "minimal";
  className?: string;
}

export function MetricCard({ title, value, icon: Icon, trend, progress, gradient, variant = "default", className }: MetricCardProps) {
  const getTrendColor = () => {
    if (!trend?.color) return "text-muted-foreground";
    
    switch (trend.color) {
      case "success":
        return "text-emerald-500 dark:text-emerald-400";
      case "warning":
        return "text-amber-500 dark:text-amber-400";
      case "danger":
        return "text-red-500 dark:text-red-400";
      default:
        return "text-muted-foreground";
    }
  };

  const getGradientClass = () => {
    if (!gradient) return "";
    
    switch (gradient) {
      case "blue":
        return "bg-gradient-to-br from-blue-500/20 to-cyan-500/20 dark:from-blue-600/30 dark:to-cyan-600/30";
      case "green":
        return "bg-gradient-to-br from-emerald-500/20 to-teal-500/20 dark:from-emerald-600/30 dark:to-teal-600/30";
      case "purple":
        return "bg-gradient-to-br from-purple-500/20 to-pink-500/20 dark:from-purple-600/30 dark:to-pink-600/30";
      case "orange":
        return "bg-gradient-to-br from-orange-500/20 to-amber-500/20 dark:from-orange-600/30 dark:to-amber-600/30";
      case "red":
        return "bg-gradient-to-br from-red-500/20 to-rose-500/20 dark:from-red-600/30 dark:to-rose-600/30";
      case "indigo":
        return "bg-gradient-to-br from-indigo-500/20 to-blue-500/20 dark:from-indigo-600/30 dark:to-blue-600/30";
      default:
        return "";
    }
  };

  const getIconBgClass = () => {
    if (!gradient) return "bg-chart-3/20 dark:bg-chart-3/30";
    
    switch (gradient) {
      case "blue":
        return "bg-blue-500/20 dark:bg-blue-500/30";
      case "green":
        return "bg-emerald-500/20 dark:bg-emerald-500/30";
      case "purple":
        return "bg-purple-500/20 dark:bg-purple-500/30";
      case "orange":
        return "bg-orange-500/20 dark:bg-orange-500/30";
      case "red":
        return "bg-red-500/20 dark:bg-red-500/30";
      case "indigo":
        return "bg-indigo-500/20 dark:bg-indigo-500/30";
      default:
        return "bg-chart-3/20 dark:bg-chart-3/30";
    }
  };

  const getIconColorClass = () => {
    if (!gradient) return "text-chart-3";
    
    switch (gradient) {
      case "blue":
        return "text-blue-600 dark:text-blue-400";
      case "green":
        return "text-emerald-600 dark:text-emerald-400";
      case "purple":
        return "text-purple-600 dark:text-purple-400";
      case "orange":
        return "text-orange-600 dark:text-orange-400";
      case "red":
        return "text-red-600 dark:text-red-400";
      case "indigo":
        return "text-indigo-600 dark:text-indigo-400";
      default:
        return "text-chart-3";
    }
  };

  const getProgressColorClass = () => {
    if (!progress?.color || progress.color === "default") return "";
    
    const progressColors = {
      success: "[&>div]:bg-emerald-500",
      warning: "[&>div]:bg-amber-500",
      danger: "[&>div]:bg-red-500",
    };
    
    return progressColors[progress.color] || "";
  };

  const isMinimal = variant === "minimal";

  return (
    <Card className={cn(
      "metric-card transition-all duration-200",
      isMinimal 
        ? "hover:border-primary/50 border-border" 
        : "hover:shadow-lg hover:scale-[1.02] border-border/50",
      !isMinimal && getGradientClass(),
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className={cn(
              "text-sm font-medium",
              isMinimal ? "text-muted-foreground" : "text-muted-foreground"
            )}>{title}</p>
            <p className="text-3xl font-bold text-foreground mt-1.5" data-testid={`metric-${title.toLowerCase().replace(/\s+/g, "-")}`}>
              {value}
            </p>
          </div>
          <div className={cn(
            "rounded-xl transition-transform duration-200",
            isMinimal ? "p-2" : "p-3 hover:scale-110",
            isMinimal ? "bg-muted" : getIconBgClass()
          )}>
            <Icon className={cn(
              "transition-colors",
              isMinimal ? "text-muted-foreground" : getIconColorClass()
            )} size={isMinimal ? 20 : 24} />
          </div>
        </div>
        
        {progress && (
          <div className="mt-4">
            <Progress 
              value={progress.value} 
              className={cn("h-2", getProgressColorClass())} 
            />
          </div>
        )}
        
        {trend && (
          <div className="mt-4 flex items-center text-sm">
            <span className={cn("font-semibold", getTrendColor())}>
              {trend.direction === "up" && "↗ "} 
              {trend.direction === "down" && "↓ "} 
              {trend.value}
            </span>
            <span className="text-muted-foreground ml-1.5">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
