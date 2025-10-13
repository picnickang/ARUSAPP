import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Wrench, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingActionBarProps {
  criticalCount: number;
  onViewCritical?: () => void;
  onCreateWorkOrder?: () => void;
  onAcknowledgeAll?: () => void;
  className?: string;
}

export function FloatingActionBar({
  criticalCount,
  onViewCritical,
  onCreateWorkOrder,
  onAcknowledgeAll,
  className
}: FloatingActionBarProps) {
  if (criticalCount === 0) return null;

  return (
    <div 
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
        "bg-destructive text-destructive-foreground rounded-full shadow-2xl",
        "px-6 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-5",
        className
      )}
      data-testid="floating-action-bar"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 animate-pulse" />
        <span className="font-semibold">
          {criticalCount} Critical {criticalCount === 1 ? 'Issue' : 'Issues'}
        </span>
      </div>
      
      <div className="h-6 w-px bg-destructive-foreground/20" />
      
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={onViewCritical}
          data-testid="button-view-critical"
        >
          View All
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onCreateWorkOrder}
          data-testid="button-create-work-order"
        >
          <Wrench className="h-4 w-4 mr-1" />
          Create Work Order
        </Button>
      </div>
    </div>
  );
}
