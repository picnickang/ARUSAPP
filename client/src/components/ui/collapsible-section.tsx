import { useState, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  defaultExpanded?: boolean;
  summary?: ReactNode;
  className?: string;
  headerAction?: ReactNode;
  "data-testid"?: string;
}

export function CollapsibleSection({
  title,
  description,
  icon,
  children,
  defaultExpanded = false,
  summary,
  className,
  headerAction,
  "data-testid": testId
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <Card className={cn("bg-card border border-border", className)} data-testid={testId}>
      <CardHeader 
        className={cn(
          "border-b border-border cursor-pointer hover:bg-muted/50 transition-colors",
          !isExpanded && "border-b-0"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            {icon && <div className="flex-shrink-0">{icon}</div>}
            <div className="flex-1">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                {title}
                {!isExpanded && summary && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    {summary}
                  </span>
                )}
              </CardTitle>
              {description && isExpanded && (
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {headerAction}
            <Button
              variant="ghost"
              size="sm"
              className="flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              data-testid={`${testId}-toggle`}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="p-4">
          {children}
        </CardContent>
      )}
    </Card>
  );
}
