import { formatDistanceToNow } from "date-fns";
import { Clock, Wifi, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface TimestampDisplayProps {
  timestamp: string | Date;
  showIcon?: boolean;
  showFullDate?: boolean;
  className?: string;
  "data-testid"?: string;
}

export function TimestampDisplay({
  timestamp,
  showIcon = true,
  showFullDate = false,
  className,
  "data-testid": testId
}: TimestampDisplayProps) {
  const date = new Date(timestamp);
  const now = new Date();
  const ageInMinutes = (now.getTime() - date.getTime()) / (1000 * 60);
  
  // Determine freshness
  const isLive = ageInMinutes < 1;
  const isRecent = ageInMinutes < 5;
  const relativeTime = formatDistanceToNow(date, { addSuffix: true });
  const fullDate = date.toLocaleString();

  return (
    <div className={cn("flex items-center gap-2", className)} data-testid={testId}>
      {showIcon && (
        <Clock className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-xs text-muted-foreground cursor-help">
            {relativeTime}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{fullDate}</p>
        </TooltipContent>
      </Tooltip>
      {showFullDate && (
        <span className="text-xs text-muted-foreground hidden md:inline">
          ({fullDate})
        </span>
      )}
    </div>
  );
}

interface FreshnessIndicatorProps {
  timestamp: string | Date;
  thresholdMinutes?: number;
  showLabel?: boolean;
  className?: string;
  "data-testid"?: string;
}

export function FreshnessIndicator({
  timestamp,
  thresholdMinutes = 5,
  showLabel = true,
  className,
  "data-testid": testId
}: FreshnessIndicatorProps) {
  const date = new Date(timestamp);
  const now = new Date();
  const ageInMinutes = (now.getTime() - date.getTime()) / (1000 * 60);
  
  const isLive = ageInMinutes < 1;
  const isFresh = ageInMinutes < thresholdMinutes;
  const relativeTime = formatDistanceToNow(date, { addSuffix: true });

  if (isLive) {
    return (
      <Badge 
        variant="outline" 
        className={cn("border-green-500 bg-green-500/10 text-green-700 dark:text-green-300", className)}
        data-testid={testId}
      >
        <Wifi className="h-3 w-3 mr-1" aria-hidden="true" />
        {showLabel && "Live"}
      </Badge>
    );
  }

  if (isFresh) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={cn("border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300", className)}
            data-testid={testId}
          >
            <Wifi className="h-3 w-3 mr-1" aria-hidden="true" />
            {showLabel && `${Math.floor(ageInMinutes)}m ago`}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Updated {relativeTime}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant="outline" 
          className={cn("border-gray-500 bg-gray-500/10 text-gray-700 dark:text-gray-300", className)}
          data-testid={testId}
        >
          <WifiOff className="h-3 w-3 mr-1" aria-hidden="true" />
          {showLabel && "Stale"}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">Last updated {relativeTime}</p>
      </TooltipContent>
    </Tooltip>
  );
}

// Combined component with both timestamp and freshness
interface DataFreshnessProps {
  timestamp: string | Date;
  label?: string;
  className?: string;
  "data-testid"?: string;
}

export function DataFreshness({
  timestamp,
  label = "Last updated",
  className,
  "data-testid": testId
}: DataFreshnessProps) {
  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)} data-testid={testId}>
      <FreshnessIndicator timestamp={timestamp} showLabel={true} />
      <TimestampDisplay timestamp={timestamp} showIcon={false} />
    </div>
  );
}
