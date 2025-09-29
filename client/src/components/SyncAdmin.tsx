import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Activity, 
  RefreshCw, 
  Database, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  BarChart3
} from "lucide-react";

interface SyncMetrics {
  totalJournalEntries: number;
  pendingEvents: number;
  failedEvents: number;
  recentActivity: number;
}

interface SyncHealth {
  status: string;
  timestamp: string;
  totalJournalEntries: number;
  pendingEvents: number;
  failedEvents: number;
  recentActivity: number;
}

export default function SyncAdmin() {
  const [isReconciling, setIsReconciling] = useState(false);
  const [lastResult, setLastResult] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch sync health metrics
  const { data: syncHealth, isLoading: isLoadingHealth } = useQuery<SyncHealth>({
    queryKey: ["/api/sync/health"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Reconciliation mutation
  const reconcileMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/sync/reconcile");
    },
    onSuccess: (data) => {
      toast({
        title: "Reconciliation Complete",
        description: `Processed ${data.eventsProcessed} events. Cost sync: ${data.costSync} updates.`,
      });
      setLastResult(JSON.stringify(data, null, 2));
      queryClient.invalidateQueries({ queryKey: ["/api/sync/health"] });
    },
    onError: (error: any) => {
      toast({
        title: "Reconciliation Failed",
        description: error.message || "Failed to complete reconciliation",
        variant: "destructive",
      });
    },
  });

  // Process events mutation
  const processEventsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/sync/process-events");
    },
    onSuccess: (data) => {
      toast({
        title: "Events Processed",
        description: `Successfully processed ${data.processed} pending events.`,
      });
      setLastResult(JSON.stringify(data, null, 2));
      queryClient.invalidateQueries({ queryKey: ["/api/sync/health"] });
    },
    onError: (error: any) => {
      toast({
        title: "Event Processing Failed",
        description: error.message || "Failed to process events",
        variant: "destructive",
      });
    },
  });

  const handleReconcile = async () => {
    setIsReconciling(true);
    try {
      await reconcileMutation.mutateAsync();
    } finally {
      setIsReconciling(false);
    }
  };

  const getHealthBadge = () => {
    if (isLoadingHealth) return <Badge variant="secondary">Loading...</Badge>;
    if (!syncHealth) return <Badge variant="destructive">Unknown</Badge>;
    
    const hasIssues = syncHealth.failedEvents > 0 || syncHealth.pendingEvents > 50;
    return (
      <Badge variant={hasIssues ? "destructive" : "default"}>
        {hasIssues ? "Issues Detected" : "Healthy"}
      </Badge>
    );
  };

  return (
    <Card className="w-full" data-testid="sync-admin-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Synchronization System
            </CardTitle>
            <CardDescription>
              Monitor and manage data synchronization across inventory, work orders, and crew assignments.
            </CardDescription>
          </div>
          {getHealthBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Metrics Overview */}
        {syncHealth && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{syncHealth.totalJournalEntries}</div>
              <div className="text-sm text-muted-foreground">Journal Entries</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{syncHealth.pendingEvents}</div>
              <div className="text-sm text-muted-foreground">Pending Events</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{syncHealth.failedEvents}</div>
              <div className="text-sm text-muted-foreground">Failed Events</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{syncHealth.recentActivity}</div>
              <div className="text-sm text-muted-foreground">24h Activity</div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleReconcile}
            disabled={isReconciling || reconcileMutation.isPending}
            className="flex items-center gap-2"
            data-testid="button-reconcile"
          >
            {isReconciling ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            Run Reconciliation
          </Button>

          <Button
            onClick={() => processEventsMutation.mutate()}
            disabled={processEventsMutation.isPending}
            variant="outline"
            className="flex items-center gap-2"
            data-testid="button-process-events"
          >
            {processEventsMutation.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Activity className="h-4 w-4" />
            )}
            Process Events
          </Button>

          <Button
            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/sync/health"] })}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            data-testid="button-refresh-metrics"
          >
            <BarChart3 className="h-4 w-4" />
            Refresh Metrics
          </Button>
        </div>

        {/* Status Information */}
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>
              Last updated: {syncHealth ? new Date(syncHealth.timestamp).toLocaleString() : "Never"}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5" />
            <div>
              <div>This system maintains consistency across:</div>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>Parts catalog ↔ Stock level cost synchronization</li>
                <li>Work order cost calculations and ROI updates</li>
                <li>Audit trails for all data changes</li>
                <li>Real-time event notifications</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Last Operation Result */}
        {lastResult && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Last Operation Result:</div>
            <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">
              {lastResult}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}