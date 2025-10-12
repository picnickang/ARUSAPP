import { HelpCircle, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface HelpTooltipProps {
  content: string | ReactNode;
  title?: string;
  children?: ReactNode;
  icon?: "help" | "info";
  iconClassName?: string;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
  "data-testid"?: string;
}

export function HelpTooltip({
  content,
  title,
  children,
  icon = "help",
  iconClassName,
  side = "top",
  className,
  "data-testid": testId
}: HelpTooltipProps) {
  const IconComponent = icon === "help" ? HelpCircle : Info;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {children || (
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center rounded-full",
              "text-muted-foreground hover:text-foreground transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              className
            )}
            aria-label="Help information"
            data-testid={testId}
          >
            <IconComponent className={cn("h-4 w-4", iconClassName)} />
          </button>
        )}
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs">
        {title && <p className="font-semibold mb-1">{title}</p>}
        {typeof content === "string" ? (
          <p className="text-sm">{content}</p>
        ) : (
          content
        )}
      </TooltipContent>
    </Tooltip>
  );
}

// Technical term with inline explanation
interface TechnicalTermProps {
  term: string;
  explanation: string | ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function TechnicalTerm({
  term,
  explanation,
  className,
  "data-testid": testId
}: TechnicalTermProps) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)} data-testid={testId}>
      <span>{term}</span>
      <HelpTooltip content={explanation} iconClassName="h-3 w-3" />
    </span>
  );
}

// Metric explanation wrapper
interface MetricWithHelpProps {
  label: string;
  value: string | number;
  explanation: string | ReactNode;
  unit?: string;
  className?: string;
  "data-testid"?: string;
}

export function MetricWithHelp({
  label,
  value,
  explanation,
  unit,
  className,
  "data-testid": testId
}: MetricWithHelpProps) {
  return (
    <div className={cn("space-y-1", className)} data-testid={testId}>
      <div className="flex items-center gap-1">
        <span className="text-sm text-muted-foreground">{label}</span>
        <HelpTooltip content={explanation} iconClassName="h-3 w-3" />
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold">{value}</span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

// Common technical term explanations
export const commonExplanations = {
  healthScore: (
    <div className="space-y-2">
      <p className="text-sm">Health score measures equipment condition based on:</p>
      <ul className="text-sm list-disc list-inside space-y-1">
        <li>Vibration patterns</li>
        <li>Temperature trends</li>
        <li>Operating hours</li>
        <li>Maintenance history</li>
      </ul>
      <p className="text-xs text-muted-foreground mt-2">
        Score &lt; 30% requires immediate attention
      </p>
    </div>
  ),
  pdmScore: (
    <div className="space-y-2">
      <p className="text-sm">
        Predictive Maintenance (PdM) Score indicates the likelihood of equipment failure.
      </p>
      <ul className="text-sm list-disc list-inside space-y-1">
        <li>0-30%: Low risk, normal operation</li>
        <li>30-60%: Monitor closely</li>
        <li>60-80%: Schedule maintenance</li>
        <li>80-100%: Immediate action required</li>
      </ul>
    </div>
  ),
  zScore: (
    <div className="space-y-2">
      <p className="text-sm">
        Z-score measures how many standard deviations a value is from the average.
      </p>
      <ul className="text-sm list-disc list-inside space-y-1">
        <li>±1: Normal variation (68% of data)</li>
        <li>±2: Unusual (95% of data)</li>
        <li>±3 or more: Abnormal, needs attention</li>
      </ul>
      <p className="text-xs text-muted-foreground mt-2">
        Higher absolute values indicate greater deviation from normal
      </p>
    </div>
  ),
  reliability: (
    <p className="text-sm">
      Reliability measures the probability that equipment will perform its intended function
      without failure over a specified period. Higher percentages indicate more reliable equipment.
    </p>
  ),
  availability: (
    <p className="text-sm">
      Availability is the percentage of time equipment is operational and ready for use.
      Calculated as (Uptime / (Uptime + Downtime)) × 100%.
    </p>
  ),
  mtbf: (
    <div className="space-y-2">
      <p className="text-sm">Mean Time Between Failures (MTBF):</p>
      <p className="text-sm">
        Average time between equipment failures. Higher values indicate more reliable equipment.
      </p>
      <p className="text-xs text-muted-foreground mt-2">
        Formula: Total Operating Time / Number of Failures
      </p>
    </div>
  ),
  mttr: (
    <div className="space-y-2">
      <p className="text-sm">Mean Time To Repair (MTTR):</p>
      <p className="text-sm">
        Average time required to repair failed equipment. Lower values are better.
      </p>
      <p className="text-xs text-muted-foreground mt-2">
        Formula: Total Repair Time / Number of Repairs
      </p>
    </div>
  )
};
