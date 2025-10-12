import { Button } from "@/components/ui/button";
import { Wrench, Calendar, Package, Eye, FileText, AlertTriangle } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface ContextualActionsProps {
  equipmentId?: string;
  equipmentName?: string;
  predictionId?: number;
  anomalyId?: number;
  compact?: boolean;
  className?: string;
  "data-testid"?: string;
}

export function ContextualActions({
  equipmentId,
  equipmentName,
  predictionId,
  anomalyId,
  compact = false,
  className,
  "data-testid": testId
}: ContextualActionsProps) {
  const [, setLocation] = useLocation();

  const handleCreateWorkOrder = () => {
    const params = new URLSearchParams();
    if (equipmentId) {
      params.set("equipment", equipmentId);
    }
    if (equipmentName) {
      params.set("title", `Maintenance for ${equipmentName}`);
    }
    if (predictionId) {
      params.set("prediction", predictionId.toString());
    }
    setLocation(`/work-orders?${params.toString()}#new`);
  };

  const handleScheduleInspection = () => {
    const params = new URLSearchParams();
    if (equipmentId) {
      params.set("equipment", equipmentId);
    }
    setLocation(`/maintenance?${params.toString()}#new`);
  };

  const handleOrderParts = () => {
    const params = new URLSearchParams();
    if (equipmentId) {
      params.set("equipment", equipmentId);
    }
    setLocation(`/inventory-management?${params.toString()}#parts`);
  };

  const handleViewDetails = () => {
    if (equipmentId) {
      setLocation(`/equipment-registry?id=${equipmentId}`);
    }
  };

  const size = compact ? "sm" : "default";

  return (
    <div 
      className={cn("flex flex-wrap gap-2", className)} 
      data-testid={testId}
      role="group"
      aria-label="Contextual actions"
    >
      <Button 
        size={size} 
        onClick={handleCreateWorkOrder}
        data-testid="action-create-work-order"
      >
        <Wrench className="mr-2 h-4 w-4" />
        {compact ? "Work Order" : "Create Work Order"}
      </Button>
      
      <Button 
        size={size} 
        variant="outline"
        onClick={handleScheduleInspection}
        data-testid="action-schedule-inspection"
      >
        <Calendar className="mr-2 h-4 w-4" />
        {compact ? "Inspect" : "Schedule Inspection"}
      </Button>
      
      <Button 
        size={size} 
        variant="outline"
        onClick={handleOrderParts}
        data-testid="action-order-parts"
      >
        <Package className="mr-2 h-4 w-4" />
        {compact ? "Parts" : "Order Parts"}
      </Button>

      {equipmentId && (
        <Button 
          size={size} 
          variant="ghost"
          onClick={handleViewDetails}
          data-testid="action-view-details"
        >
          <Eye className="mr-2 h-4 w-4" />
          {compact ? "Details" : "View Details"}
        </Button>
      )}
    </div>
  );
}

// Compact action buttons for alerts/predictions
interface QuickActionsProps {
  equipmentId?: string;
  equipmentName?: string;
  predictionId?: number;
  className?: string;
  "data-testid"?: string;
}

export function QuickActions({
  equipmentId,
  equipmentName,
  predictionId,
  className,
  "data-testid": testId
}: QuickActionsProps) {
  return (
    <ContextualActions
      equipmentId={equipmentId}
      equipmentName={equipmentName}
      predictionId={predictionId}
      compact={true}
      className={className}
      data-testid={testId}
    />
  );
}

// Single primary action (for critical alerts)
interface PrimaryActionProps {
  action: "work-order" | "inspection" | "parts";
  equipmentId?: string;
  equipmentName?: string;
  label?: string;
  variant?: "default" | "destructive";
  className?: string;
  "data-testid"?: string;
}

export function PrimaryAction({
  action,
  equipmentId,
  equipmentName,
  label,
  variant = "default",
  className,
  "data-testid": testId
}: PrimaryActionProps) {
  const [, setLocation] = useLocation();

  const actionConfig = {
    "work-order": {
      icon: Wrench,
      defaultLabel: "Create Work Order",
      handler: () => {
        const params = new URLSearchParams();
        if (equipmentId) params.set("equipment", equipmentId);
        if (equipmentName) params.set("title", `Maintenance for ${equipmentName}`);
        setLocation(`/work-orders?${params.toString()}#new`);
      }
    },
    "inspection": {
      icon: Calendar,
      defaultLabel: "Schedule Inspection",
      handler: () => {
        const params = new URLSearchParams();
        if (equipmentId) params.set("equipment", equipmentId);
        setLocation(`/maintenance?${params.toString()}#new`);
      }
    },
    "parts": {
      icon: Package,
      defaultLabel: "Order Parts",
      handler: () => {
        const params = new URLSearchParams();
        if (equipmentId) params.set("equipment", equipmentId);
        setLocation(`/inventory-management?${params.toString()}#parts`);
      }
    }
  };

  const config = actionConfig[action];
  const Icon = config.icon;

  return (
    <Button 
      variant={variant}
      onClick={config.handler}
      className={className}
      data-testid={testId}
    >
      <Icon className="mr-2 h-4 w-4" />
      {label || config.defaultLabel}
    </Button>
  );
}
