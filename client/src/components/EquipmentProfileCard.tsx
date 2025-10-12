import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  Activity, 
  TrendingUp, 
  DollarSign, 
  AlertTriangle,
  Calendar,
  Zap
} from "lucide-react";
import { SeverityIcon, getSeverityFromHealth, severityConfig } from "@/lib/severity-utils";
import { QuickActions } from "@/components/ui/contextual-actions";
import { DataFreshness } from "@/components/ui/timestamp-display";
import { HelpTooltip, commonExplanations } from "@/components/ui/help-tooltip";
import { cn } from "@/lib/utils";

interface EquipmentProfileCardProps {
  equipment: {
    id: string;
    name: string;
    health?: number;
    status?: string;
    performance?: number;
    reliability?: number;
    availability?: number;
    efficiency?: number;
    riskLevel?: string;
    failureProbability?: number;
    estimatedTimeToFailure?: number;
    nextMaintenanceDue?: string;
    monthlyCost?: number;
    costTrend?: number;
    roi?: number;
    anomalyCount?: number;
    lastUpdated?: string;
  };
  showActions?: boolean;
  compact?: boolean;
  className?: string;
  "data-testid"?: string;
}

export function EquipmentProfileCard({
  equipment,
  showActions = true,
  compact = false,
  className,
  "data-testid": testId
}: EquipmentProfileCardProps) {
  const health = equipment.health || 0;
  const severity = getSeverityFromHealth(health);
  const config = severityConfig[severity];

  const formatCurrency = (value?: number) => {
    if (!value) return "N/A";
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDays = (hours?: number) => {
    if (!hours) return "N/A";
    const days = Math.floor(hours / 24);
    return `${days} days`;
  };

  return (
    <Card 
      className={cn(
        "border-l-4",
        config.borderColor,
        severity === "critical" ? "shadow-lg shadow-red-500/10" : "",
        className
      )}
      data-testid={testId}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="mt-0.5">
              <SeverityIcon severity={severity} className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold truncate">
                {equipment.name}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant={config.badgeVariant} className="text-xs">
                  {config.label}
                </Badge>
                {equipment.lastUpdated && (
                  <DataFreshness timestamp={equipment.lastUpdated} />
                )}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Health & Performance Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Health</span>
                <HelpTooltip content={commonExplanations.healthScore} />
              </div>
              <span className={cn("text-sm font-semibold", config.textColor)}>
                {health}%
              </span>
            </div>
            <Progress value={health} className="h-2" />
          </div>

          {equipment.performance !== undefined && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Performance</span>
                </div>
                <span className="text-sm font-semibold">{equipment.performance}%</span>
              </div>
              <Progress value={equipment.performance} className="h-2" />
            </div>
          )}
        </div>

        {!compact && (
          <>
            {/* Operational Metrics */}
            {(equipment.reliability !== undefined || equipment.availability !== undefined || equipment.efficiency !== undefined) && (
              <>
                <Separator />
                <div className="grid grid-cols-3 gap-2 text-center">
                  {equipment.reliability !== undefined && (
                    <div>
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <p className="text-xs text-muted-foreground">Reliability</p>
                        <HelpTooltip content={commonExplanations.reliability} iconClassName="h-3 w-3" />
                      </div>
                      <p className="text-lg font-bold">{equipment.reliability}%</p>
                    </div>
                  )}
                  {equipment.availability !== undefined && (
                    <div>
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <p className="text-xs text-muted-foreground">Availability</p>
                        <HelpTooltip content={commonExplanations.availability} iconClassName="h-3 w-3" />
                      </div>
                      <p className="text-lg font-bold">{equipment.availability}%</p>
                    </div>
                  )}
                  {equipment.efficiency !== undefined && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Efficiency</p>
                      <p className="text-lg font-bold">{equipment.efficiency}%</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Predictions & Alerts */}
            {(equipment.failureProbability !== undefined || equipment.anomalyCount !== undefined) && (
              <>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {equipment.failureProbability !== undefined && equipment.failureProbability > 0.3 && (
                    <div className="flex items-start gap-2 p-2 bg-muted/50 rounded-md">
                      <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium">Failure Risk</p>
                        <p className="text-sm">
                          {(equipment.failureProbability * 100).toFixed(0)}% probability
                          {equipment.estimatedTimeToFailure && (
                            <span className="text-muted-foreground">
                              {" "}in {formatDays(equipment.estimatedTimeToFailure)}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  {equipment.anomalyCount !== undefined && equipment.anomalyCount > 0 && (
                    <div className="flex items-start gap-2 p-2 bg-muted/50 rounded-md">
                      <Zap className="h-4 w-4 text-yellow-500 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium">Anomalies</p>
                        <p className="text-sm">{equipment.anomalyCount} detected</p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Cost & ROI */}
            {(equipment.monthlyCost !== undefined || equipment.roi !== undefined) && (
              <>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {equipment.monthlyCost !== undefined && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Monthly Cost</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(equipment.monthlyCost)}</p>
                        {equipment.costTrend !== undefined && (
                          <p className={cn(
                            "text-xs",
                            equipment.costTrend > 0 ? "text-red-500" : "text-green-500"
                          )}>
                            {equipment.costTrend > 0 ? "+" : ""}{equipment.costTrend}%
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {equipment.roi !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm">ROI</span>
                      <p className="text-sm font-semibold text-green-600">{equipment.roi}%</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Maintenance Schedule */}
            {equipment.nextMaintenanceDue && (
              <>
                <Separator />
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Next Maintenance</span>
                  </div>
                  <span className="text-sm font-medium">
                    {new Date(equipment.nextMaintenanceDue).toLocaleDateString()}
                  </span>
                </div>
              </>
            )}
          </>
        )}

        {/* Actions */}
        {showActions && (
          <>
            <Separator />
            <QuickActions 
              equipmentId={equipment.id}
              equipmentName={equipment.name}
              data-testid="equipment-profile-actions"
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
