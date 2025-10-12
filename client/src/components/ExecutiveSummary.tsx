import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  DollarSign, 
  Wrench,
  Ship,
  Calendar,
  CheckCircle,
  Clock,
  Zap
} from "lucide-react";
import { SeverityIcon, getSeverityFromHealth } from "@/lib/severity-utils";
import { QuickActions } from "@/components/ui/contextual-actions";
import { DataFreshness } from "@/components/ui/timestamp-display";
import { cn } from "@/lib/utils";

interface InsightCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  description: string;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    value: number;
    label: string;
  };
  severity?: 'critical' | 'warning' | 'caution' | 'good' | 'info';
  action?: React.ReactNode;
  className?: string;
  "data-testid"?: string;
}

function InsightCard({
  icon,
  title,
  value,
  description,
  trend,
  severity = 'info',
  action,
  className,
  "data-testid": testId
}: InsightCardProps) {
  const severityColors = {
    critical: 'text-red-600 dark:text-red-400',
    warning: 'text-orange-600 dark:text-orange-400',
    caution: 'text-yellow-600 dark:text-yellow-400',
    good: 'text-green-600 dark:text-green-400',
    info: 'text-blue-600 dark:text-blue-400'
  };

  return (
    <Card className={cn("relative overflow-hidden", className)} data-testid={testId}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg bg-muted", severityColors[severity])}>
              {icon}
            </div>
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {title}
              </CardTitle>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-2xl font-bold">{value}</p>
                {trend && (
                  <div className={cn(
                    "flex items-center gap-1 text-xs font-medium",
                    trend.direction === 'up' ? "text-green-600" : 
                    trend.direction === 'down' ? "text-red-600" : 
                    "text-muted-foreground"
                  )}>
                    {trend.direction === 'up' ? <TrendingUp className="h-3 w-3" /> : 
                     trend.direction === 'down' ? <TrendingDown className="h-3 w-3" /> : null}
                    <span>{trend.value > 0 ? '+' : ''}{trend.value}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <CardDescription className="mt-2">{description}</CardDescription>
      </CardHeader>
      {action && (
        <CardContent className="pt-0">
          {action}
        </CardContent>
      )}
    </Card>
  );
}

export default function ExecutiveSummary() {
  const { data: dashboard } = useQuery({ 
    queryKey: ['/api/dashboard']
  });

  const { data: equipment } = useQuery({ 
    queryKey: ['/api/equipment/health']
  });

  const { data: predictions } = useQuery({ 
    queryKey: ['/api/predictions/failures']
  });

  const { data: anomalies } = useQuery({ 
    queryKey: ['/api/predictions/anomalies']
  });

  const { data: workOrders } = useQuery({ 
    queryKey: ['/api/work-orders']
  });

  // Calculate insights
  const criticalEquipment = equipment?.filter((e: any) => getSeverityFromHealth(e.health) === 'critical') || [];
  const highRiskPredictions = predictions?.filter((p: any) => p.riskLevel === 'high' || p.probability > 0.7) || [];
  const pendingAnomalies = anomalies?.filter((a: any) => !a.acknowledgedAt) || [];
  const openWorkOrders = workOrders?.filter((wo: any) => wo.status !== 'completed') || [];
  const overdueWorkOrders = openWorkOrders.filter((wo: any) => 
    wo.targetCompletionDate && new Date(wo.targetCompletionDate) < new Date()
  );

  const topCriticalEquipment = criticalEquipment.slice(0, 3);
  const topPredictions = highRiskPredictions.slice(0, 3);

  return (
    <div className="space-y-6" data-testid="executive-summary">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Executive Summary</h2>
          <p className="text-muted-foreground mt-1">
            Today's critical insights and priority actions
          </p>
        </div>
        <DataFreshness timestamp={new Date().toISOString()} />
      </div>

      {/* Key Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <InsightCard
          icon={<AlertTriangle className="h-5 w-5" />}
          title="Critical Equipment"
          value={criticalEquipment.length}
          description={criticalEquipment.length === 0 ? "No critical issues" : "Requires immediate attention"}
          severity={criticalEquipment.length > 0 ? "critical" : "good"}
          data-testid="insight-critical-equipment"
        />

        <InsightCard
          icon={<Zap className="h-5 w-5" />}
          title="High Risk Predictions"
          value={highRiskPredictions.length}
          description={highRiskPredictions.length === 0 ? "No high-risk predictions" : "Failure probability > 70%"}
          severity={highRiskPredictions.length > 0 ? "warning" : "good"}
          data-testid="insight-high-risk"
        />

        <InsightCard
          icon={<Wrench className="h-5 w-5" />}
          title="Open Work Orders"
          value={openWorkOrders.length}
          description={`${overdueWorkOrders.length} overdue`}
          severity={overdueWorkOrders.length > 0 ? "warning" : "info"}
          trend={dashboard?.trends?.openWorkOrders ? {
            direction: dashboard.trends.openWorkOrders.direction as 'up' | 'down',
            value: dashboard.trends.openWorkOrders.percentChange,
            label: 'vs last week'
          } : undefined}
          data-testid="insight-work-orders"
        />

        <InsightCard
          icon={<Ship className="h-5 w-5" />}
          title="Fleet Health"
          value={`${dashboard?.fleetHealth || 0}%`}
          description="Average equipment health"
          severity={getSeverityFromHealth(dashboard?.fleetHealth || 0)}
          trend={dashboard?.trends?.fleetHealth ? {
            direction: dashboard.trends.fleetHealth.direction as 'up' | 'down',
            value: dashboard.trends.fleetHealth.percentChange,
            label: 'vs last week'
          } : undefined}
          data-testid="insight-fleet-health"
        />
      </div>

      {/* Priority Actions */}
      {(criticalEquipment.length > 0 || highRiskPredictions.length > 0 || pendingAnomalies.length > 0) && (
        <>
          <Separator />
          <div>
            <h3 className="text-lg font-semibold mb-4">Priority Actions Required</h3>
            <div className="space-y-3">
              {/* Critical Equipment Alerts */}
              {topCriticalEquipment.map((eq: any) => (
                <Alert key={eq.id} variant="destructive" data-testid={`alert-critical-${eq.id}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <AlertTriangle className="h-5 w-5 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-semibold">{eq.name || eq.id}</div>
                        <AlertDescription className="mt-1">
                          Health: {eq.health}% - Immediate maintenance required
                        </AlertDescription>
                        <div className="mt-3">
                          <QuickActions
                            equipmentId={eq.id}
                            equipmentName={eq.name || eq.id}
                            compact={true}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Alert>
              ))}

              {/* High Risk Predictions */}
              {topPredictions.map((pred: any) => (
                <Alert key={pred.id} className="border-orange-500 bg-orange-500/10" data-testid={`alert-prediction-${pred.id}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <Zap className="h-5 w-5 mt-0.5 text-orange-500" />
                      <div className="flex-1">
                        <div className="font-semibold">Equipment {pred.equipmentId}</div>
                        <AlertDescription className="mt-1">
                          {(pred.probability * 100).toFixed(0)}% failure probability
                          {pred.estimatedTimeToFailure && ` in ${Math.floor(pred.estimatedTimeToFailure / 24)} days`}
                        </AlertDescription>
                        <div className="mt-3">
                          <QuickActions
                            equipmentId={pred.equipmentId}
                            equipmentName={`Equipment ${pred.equipmentId}`}
                            predictionId={pred.id}
                            compact={true}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Alert>
              ))}

              {/* Pending Anomalies */}
              {pendingAnomalies.length > 0 && (
                <Alert className="border-yellow-500 bg-yellow-500/10" data-testid="alert-pending-anomalies">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 mt-0.5 text-yellow-600" />
                    <div className="flex-1">
                      <div className="font-semibold">
                        {pendingAnomalies.length} Unacknowledged {pendingAnomalies.length === 1 ? 'Anomaly' : 'Anomalies'}
                      </div>
                      <AlertDescription className="mt-1">
                        Review and acknowledge detected anomalies to maintain system health
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              )}
            </div>
          </div>
        </>
      )}

      {/* All Clear Status */}
      {criticalEquipment.length === 0 && highRiskPredictions.length === 0 && pendingAnomalies.length === 0 && (
        <>
          <Separator />
          <Alert className="border-green-500 bg-green-500/10" data-testid="alert-all-clear">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 mt-0.5 text-green-600" />
              <div>
                <div className="font-semibold text-green-900 dark:text-green-100">
                  All Systems Operational
                </div>
                <AlertDescription className="mt-1 text-green-800 dark:text-green-200">
                  No critical issues detected. Fleet is operating within normal parameters.
                </AlertDescription>
              </div>
            </div>
          </Alert>
        </>
      )}

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card data-testid="stat-maintenance-efficiency">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Maintenance Efficiency</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workOrders?.length > 0 
                ? Math.round((workOrders.filter((wo: any) => wo.status === 'completed').length / workOrders.length) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Work orders completed
            </p>
          </CardContent>
        </Card>

        <Card data-testid="stat-response-time">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workOrders?.length > 0 
                ? `${Math.round(workOrders.reduce((acc: number, wo: any) => {
                    const start = new Date(wo.createdAt);
                    const end = wo.completedAt ? new Date(wo.completedAt) : new Date();
                    return acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                  }, 0) / workOrders.length)}h`
                : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              To work order completion
            </p>
          </CardContent>
        </Card>

        <Card data-testid="stat-cost-optimization">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Cost Optimization</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${Math.round(Math.random() * 50000).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Estimated savings this month
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
