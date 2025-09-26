import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Brain, TrendingUp, TrendingDown, Target, Zap, RefreshCw, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricCard } from "@/components/metric-card";
import { fetchLatestInsightSnapshot, triggerInsightsGeneration, fetchInsightsJobStats } from "@/lib/api";
import { formatDistanceToNow, format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface InsightsOverviewProps {
  orgId?: string;
  scope?: string;
}

export function InsightsOverview({ orgId = 'default-org-id', scope = 'fleet' }: InsightsOverviewProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  // Fetch latest insights snapshot
  const { data: latestSnapshot, isLoading: snapshotLoading, error: snapshotError } = useQuery({
    queryKey: ['/api/insights/snapshots/latest', orgId, scope],
    queryFn: () => fetchLatestInsightSnapshot(orgId, scope),
    refetchInterval: 300000, // Refresh every 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry if it's a 404 (no snapshots yet)
      if (error?.message?.includes('404')) {
        return false;
      }
      return failureCount < 2;
    }
  });

  // Fetch job statistics
  const { data: jobStats } = useQuery({
    queryKey: ['/api/insights/jobs/stats'],
    queryFn: fetchInsightsJobStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const handleGenerateInsights = async () => {
    setIsGenerating(true);
    try {
      await triggerInsightsGeneration(orgId, scope);
      toast({
        title: "Insights Generation Started",
        description: "Fleet insights are being generated. This may take 1-2 minutes.",
      });
      
      // Refresh the snapshot query after a short delay
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/insights/snapshots/latest'] });
      }, 5000);
      
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate insights",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Show loading state
  if (snapshotLoading) {
    return (
      <Card data-testid="insights-overview">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Fleet Insights</CardTitle>
          <Brain className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show empty state if no snapshots exist yet
  if (snapshotError || !latestSnapshot) {
    return (
      <Card data-testid="insights-overview">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Fleet Insights</CardTitle>
          <Brain className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              No insights generated yet. Create your first fleet insights analysis.
            </p>
            <Button 
              onClick={handleGenerateInsights}
              disabled={isGenerating}
              size="sm"
              data-testid="button-generate-insights"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Generate Insights
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const insights = latestSnapshot.insights;
  const generatedAt = new Date(latestSnapshot.createdAt);

  return (
    <div className="space-y-4" data-testid="insights-overview">
      {/* Header with generation info */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-sm font-medium">Fleet Insights</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Generated {formatDistanceToNow(generatedAt, { addSuffix: true })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {jobStats && jobStats.totalJobs > 0 && (
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {jobStats.completedJobs}/{jobStats.totalJobs} jobs
              </Badge>
            )}
            <Button 
              onClick={handleGenerateInsights}
              disabled={isGenerating}
              size="sm"
              variant="outline"
              data-testid="button-refresh-insights"
            >
              {isGenerating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Fleet Performance Score */}
            <MetricCard
              title="Performance Score"
              value={`${insights.fleetPerformanceScore}%`}
              icon={Target}
              trend={{
                value: insights.performanceTrend || 0,
                label: "vs last period",
                direction: (insights.performanceTrend || 0) >= 0 ? "up" : "down",
                color: (insights.performanceTrend || 0) >= 0 ? "success" : "warning"
              }}
              data-testid="metric-performance-score"
            />

            {/* Risk Assessment */}
            <MetricCard
              title="Fleet Risk Level"
              value={insights.riskLevel || 'Unknown'}
              icon={AlertTriangle}
              trend={{
                value: `${insights.riskFactors?.length || 0} factors`,
                label: "identified",
                color: insights.riskLevel === 'Low' ? 'success' : 
                       insights.riskLevel === 'Medium' ? 'warning' : 'danger'
              }}
              data-testid="metric-risk-level"
            />

            {/* Maintenance Efficiency */}
            <MetricCard
              title="Maintenance Efficiency"
              value={`${insights.maintenanceEfficiency || 0}%`}
              icon={TrendingUp}
              trend={{
                value: insights.efficiencyTrend || 0,
                label: "efficiency change",
                direction: (insights.efficiencyTrend || 0) >= 0 ? "up" : "down",
                color: (insights.efficiencyTrend || 0) >= 0 ? "success" : "warning"
              }}
              data-testid="metric-maintenance-efficiency"
            />
          </div>

          {/* Key Insights Summary */}
          {insights.keyInsights && insights.keyInsights.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium mb-3">Key Insights</h4>
              <div className="space-y-2">
                {insights.keyInsights.slice(0, 3).map((insight: string, index: number) => (
                  <div key={index} className="flex items-start gap-2 text-sm">
                    <div className="h-1.5 w-1.5 rounded-full bg-chart-3 mt-2 flex-shrink-0" />
                    <p className="text-muted-foreground" data-testid={`insight-${index}`}>
                      {insight}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations Preview */}
          {insights.recommendations && insights.recommendations.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Top Recommendations</h4>
              <div className="text-sm text-muted-foreground">
                <p data-testid="recommendation-preview">
                  {insights.recommendations[0]} 
                  {insights.recommendations.length > 1 && (
                    <span className="ml-1 text-xs">
                      (+{insights.recommendations.length - 1} more)
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}