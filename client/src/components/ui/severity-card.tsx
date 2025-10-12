import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  SeverityLevel, 
  getSeverityCardClasses, 
  SeverityIcon, 
  severityConfig,
  getSeverityBadgeProps
} from "@/lib/severity-utils";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface SeverityCardProps {
  severity: SeverityLevel;
  title: string;
  description?: string;
  children?: ReactNode;
  actions?: ReactNode;
  showBadge?: boolean;
  animate?: boolean;
  className?: string;
  "data-testid"?: string;
}

export function SeverityCard({
  severity,
  title,
  description,
  children,
  actions,
  showBadge = true,
  animate = false,
  className,
  "data-testid": testId
}: SeverityCardProps) {
  const config = severityConfig[severity];
  const badgeProps = getSeverityBadgeProps(severity);

  return (
    <Card 
      className={cn(getSeverityCardClasses(severity, animate && severity === "critical"), className)}
      role={severity === "critical" || severity === "warning" ? "alert" : undefined}
      data-testid={testId}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="mt-0.5">
              <SeverityIcon severity={severity} className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold flex items-center gap-2 flex-wrap">
                {title}
                {showBadge && (
                  <Badge {...badgeProps} className="text-xs">
                    {config.label}
                  </Badge>
                )}
              </CardTitle>
              {description && (
                <CardDescription className="mt-1 text-sm">
                  {description}
                </CardDescription>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      
      {children && (
        <CardContent className="pt-0">
          {children}
        </CardContent>
      )}
      
      {actions && (
        <CardContent className="pt-0 pb-4">
          <div className="flex flex-wrap gap-2">
            {actions}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// Compact version for lists/grids
interface SeverityCardCompactProps {
  severity: SeverityLevel;
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function SeverityCardCompact({
  severity,
  title,
  value,
  subtitle,
  icon,
  className,
  "data-testid": testId
}: SeverityCardCompactProps) {
  const config = severityConfig[severity];

  return (
    <Card className={cn("relative overflow-hidden", className)} data-testid={testId}>
      {/* Severity indicator bar */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1", config.bgColor, config.borderColor)} />
      
      <CardContent className="p-4 pl-5">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground truncate">{title}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className={cn("text-2xl font-bold", config.textColor)}>{value}</p>
              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </div>
          {icon ? (
            <div className={cn("p-3 rounded-lg", config.bgColor)}>
              {icon}
            </div>
          ) : (
            <div className={cn("p-3 rounded-lg", config.bgColor)}>
              <SeverityIcon severity={severity} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
