import { cn } from "@/lib/utils";
import type { DeviceStatus } from "@shared/schema";

interface StatusIndicatorProps {
  status: DeviceStatus | "healthy" | "warning" | "critical" | "offline";
  showLabel?: boolean;
  className?: string;
}

export function StatusIndicator({ status, showLabel = false, className }: StatusIndicatorProps) {
  const getStatusClass = () => {
    switch (status.toLowerCase()) {
      case "online":
      case "healthy":
        return "status-healthy";
      case "warning":
        return "status-warning";
      case "critical":
        return "status-critical";
      case "offline":
        return "status-offline";
      default:
        return "status-offline";
    }
  };

  const getStatusLabel = () => {
    switch (status.toLowerCase()) {
      case "online":
        return "Online";
      case "healthy":
        return "Healthy";
      case "warning":
        return "Warning";
      case "critical":
        return "Critical";
      case "offline":
        return "Offline";
      default:
        return "Unknown";
    }
  };

  return (
    <div className={cn("flex items-center", className)}>
      <span className={cn("status-indicator", getStatusClass())}></span>
      {showLabel && <span>{getStatusLabel()}</span>}
    </div>
  );
}
