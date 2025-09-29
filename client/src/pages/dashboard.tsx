import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Cpu, Heart, Wrench, AlertTriangle, Eye, Plus, BarChart3, X, Ship, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MetricCard } from "@/components/metric-card";
import { StatusIndicator } from "@/components/status-indicator";
import { 
  fetchDashboardMetrics, 
  fetchDevices, 
  fetchEquipmentHealth, 
  fetchWorkOrders,
  fetchVesselFleetOverview,
  fetchLatestTelemetryReadings
} from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { queryClient, CACHE_TIMES } from "@/lib/queryClient";
import { formatTimeSgt } from "@/lib/time-utils";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { InsightsOverview } from "@/components/InsightsOverview";

export default function Dashboard() {
  const [alertBanner, setAlertBanner] = useState<any>(null);
  const [selectedVessel, setSelectedVessel] = useState<string>("all");
  const { toast } = useToast();
  
  // WebSocket connection for real-time updates
  const { isConnected, latestAlert, subscribe, unsubscribe } = useWebSocket({
    autoConnect: true
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/dashboard"],
    queryFn: fetchDashboardMetrics,
    refetchInterval: CACHE_TIMES.REALTIME, // 30s for live metrics
    staleTime: CACHE_TIMES.REALTIME,
  });

  const { data: devices, isLoading: devicesLoading } = useQuery({
    queryKey: ["/api/devices"],
    queryFn: fetchDevices,
    refetchInterval: CACHE_TIMES.MODERATE, // 5min - devices don't change frequently
    staleTime: CACHE_TIMES.MODERATE,
  });

  const { data: equipmentHealth, isLoading: healthLoading } = useQuery({
    queryKey: ["/api/equipment/health"],
    queryFn: fetchEquipmentHealth,
    refetchInterval: CACHE_TIMES.REALTIME, // 30s for health data
    staleTime: CACHE_TIMES.REALTIME,
  });

  const { data: workOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/work-orders"],
    queryFn: () => fetchWorkOrders(),
    refetchInterval: CACHE_TIMES.MODERATE, // 5min - work orders change infrequently
    staleTime: CACHE_TIMES.MODERATE,
  });

  // Fetch all vessels for dropdown filter
  const { data: allVessels = [], isLoading: vesselsLoading } = useQuery({
    queryKey: ["/api/vessels"],
    refetchInterval: CACHE_TIMES.STABLE, // 30min - vessel data is relatively stable
    staleTime: CACHE_TIMES.STABLE,
  });

  // Vessel-centric fleet overview
  const { data: vesselOverview, isLoading: vesselOverviewLoading } = useQuery({
    queryKey: ["/api/fleet/overview"],
    queryFn: () => fetchVesselFleetOverview(),
    refetchInterval: CACHE_TIMES.REALTIME, // 30s for fleet overview
    staleTime: CACHE_TIMES.REALTIME,
  });

  // Latest telemetry readings (filtered by selected vessel)
  const { data: latestReadings, isLoading: latestReadingsLoading } = useQuery({
    queryKey: ["/api/telemetry/latest", selectedVessel],
    queryFn: () => fetchLatestTelemetryReadings(
      selectedVessel === "all" ? undefined : selectedVessel,
      undefined,
      undefined,
      50 // Limit to 50 readings
    ),
    refetchInterval: CACHE_TIMES.REALTIME, // 30s for live telemetry
    staleTime: CACHE_TIMES.REALTIME,
  });

  const currentTime = formatTimeSgt(new Date()) + " SGT";

  // Get vessel names for filter dropdown from actual vessels table
  const vessels = allVessels?.map(vessel => vessel.name) || [];

  // Subscribe to alerts channel for real-time notifications
  useEffect(() => {
    if (isConnected) {
      subscribe('alerts');
      subscribe('dashboard');
    }
    
    return () => {
      unsubscribe('alerts');
      unsubscribe('dashboard');
    };
  }, [isConnected, subscribe, unsubscribe]);

  // Handle new alert notifications
  useEffect(() => {
    if (latestAlert && !latestAlert.acknowledged) {
      // Show alert banner
      setAlertBanner(latestAlert);
      
      // Handle different alert types (maintenance scheduling vs regular alerts)
      const alertType = latestAlert.alertType || (latestAlert as any).type || 'info';
      const isMaintenanceAlert = (latestAlert as any).type === 'maintenance_scheduled';
      
      // Show toast notification
      toast({
        title: isMaintenanceAlert ? 'Maintenance Scheduled' : `${alertType.toUpperCase()} Alert`,
        description: latestAlert.message,
        variant: alertType === 'critical' ? 'destructive' : 'default',
      });
      
      // Auto-hide banner after 10 seconds for non-critical alerts
      if (alertType !== 'critical') {
        setTimeout(() => {
          setAlertBanner(null);
        }, 10000);
      }
    }
  }, [latestAlert, toast]);

  const refreshData = () => {
    // Invalidate all queries to force refresh
    queryClient.invalidateQueries();
  };

  const dismissAlert = () => {
    setAlertBanner(null);
  };

  if (metricsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Live Alert Banner */}
      {alertBanner && (() => {
        const bannerAlertType = alertBanner.alertType || (alertBanner as any).type || 'info';
        const isMaintenanceBanner = (alertBanner as any).type === 'maintenance_scheduled';
        return (
          <div 
            className={`mx-4 lg:mx-6 mt-4 lg:mt-6 p-3 lg:p-4 rounded-lg border-l-4 ${
              bannerAlertType === 'critical' 
                ? 'bg-destructive/10 border-destructive text-destructive-foreground' 
                : isMaintenanceBanner
                ? 'bg-blue-500/10 border-blue-500 text-blue-700 dark:text-blue-300'
                : 'bg-yellow-500/10 border-yellow-500 text-yellow-700 dark:text-yellow-300'
            }`}
            data-testid="alert-banner"
          >
            <div className="flex items-start justify-between space-x-3">
              <div className="flex items-start space-x-3 flex-1 min-w-0">
                <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm lg:text-base break-words">
                    {isMaintenanceBanner ? 'MAINTENANCE SCHEDULED' : `${bannerAlertType.toUpperCase()} ALERT`} - {alertBanner.equipmentId}
                  </p>
                  <p className="text-sm opacity-90 break-words">{alertBanner.message}</p>
                  <p className="text-xs opacity-75 mt-1">
                    {formatDistanceToNow(new Date(alertBanner.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={dismissAlert}
                data-testid="button-dismiss-alert"
                className="flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })()}

      {/* Header */}
      <header className="bg-card border-b border-border px-4 lg:px-6 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold text-foreground">Fleet Overview</h2>
            <p className="text-muted-foreground text-sm lg:text-base">Real-time monitoring and predictive maintenance</p>
          </div>
          <div className="flex flex-col lg:flex-row lg:items-center space-y-3 lg:space-y-0 lg:space-x-4">
            {/* Vessel Filter */}
            <div className="flex items-center space-x-2">
              <Ship className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedVessel} onValueChange={setSelectedVessel}>
                <SelectTrigger className="w-32 lg:w-40" data-testid="select-vessel-filter">
                  <SelectValue placeholder="All Vessels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vessels</SelectItem>
                  {vessels.map((vessel) => (
                    <SelectItem key={vessel} value={vessel} data-testid={`vessel-option-${vessel}`}>
                      {vessel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={refreshData}
              className="bg-primary text-primary-foreground hover:bg-primary/90 w-full lg:w-auto"
              data-testid="button-refresh"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Data
            </Button>
            <div className="flex items-center justify-between lg:space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span data-testid="text-ws-status">{isConnected ? 'Live' : 'Offline'}</span>
              </div>
              <span data-testid="text-current-time" className="hidden sm:inline">{currentTime}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
        {/* Metrics Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <MetricCard
            title="Active Devices"
            value={metrics?.activeDevices || 0}
            icon={Cpu}
            trend={{
              value: "2",
              label: "devices online",
              direction: "up",
              color: "success"
            }}
          />
          
          <MetricCard
            title="Fleet Health"
            value={`${metrics?.fleetHealth || 0}%`}
            icon={Heart}
            trend={{
              value: "3%",
              label: "from last week",
              direction: "down",
              color: "warning"
            }}
          />
          
          <MetricCard
            title="Open Work Orders"
            value={metrics?.openWorkOrders || 0}
            icon={Wrench}
            trend={{
              value: "4",
              label: "high priority",
              color: "warning"
            }}
          />
          
          <MetricCard
            title="Risk Alerts"
            value={metrics?.riskAlerts || 0}
            icon={AlertTriangle}
            trend={{
              value: "2",
              label: "new alerts",
              direction: "up",
              color: "danger"
            }}
          />
        </div>

        {/* Insights Overview */}
        <InsightsOverview orgId="default-org-id" scope="fleet" />

        {/* Fleet Status Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Device Status */}
          <Card className="bg-card border border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-lg font-semibold">Device Status</CardTitle>
              <p className="text-sm text-muted-foreground">Real-time edge device monitoring</p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Device ID</TableHead>
                      <TableHead>Vessel</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>CPU</TableHead>
                      <TableHead>Memory</TableHead>
                      <TableHead>Last Heartbeat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {devicesLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          Loading devices...
                        </TableCell>
                      </TableRow>
                    ) : (
                      devices?.map((device) => (
                        <TableRow key={device.id} className="hover:bg-muted">
                          <TableCell className="font-mono text-sm" data-testid={`device-id-${device.id}`}>
                            {device.id}
                          </TableCell>
                          <TableCell data-testid={`device-vessel-${device.id}`}>
                            {device.vessel || "Unknown"}
                          </TableCell>
                          <TableCell>
                            <StatusIndicator status={device.status} showLabel />
                          </TableCell>
                          <TableCell data-testid={`device-cpu-${device.id}`}>
                            {device.lastHeartbeat?.cpuPct ? `${device.lastHeartbeat.cpuPct}%` : "–"}
                          </TableCell>
                          <TableCell data-testid={`device-memory-${device.id}`}>
                            {device.lastHeartbeat?.memPct ? `${device.lastHeartbeat.memPct}%` : "–"}
                          </TableCell>
                          <TableCell data-testid={`device-heartbeat-${device.id}`}>
                            {device.lastHeartbeat?.ts 
                              ? formatDistanceToNow(new Date(device.lastHeartbeat.ts), { addSuffix: true })
                              : "Never"
                            }
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Predictive Maintenance Panel */}
          <Card className="bg-card border border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-lg font-semibold">Predictive Maintenance</CardTitle>
              <p className="text-sm text-muted-foreground">Equipment health and failure predictions</p>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {healthLoading ? (
                <div className="text-center text-muted-foreground">Loading equipment health...</div>
              ) : (
                equipmentHealth?.map((equipment) => (
                  <div 
                    key={equipment.id} 
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    data-testid={`equipment-${equipment.id}`}
                  >
                    <div className="flex items-center space-x-3">
                      <StatusIndicator status={equipment.status} />
                      <div>
                        <p className="font-medium text-foreground">{equipment.id}</p>
                        <p className="text-sm text-muted-foreground">{equipment.vessel}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${
                        equipment.healthIndex >= 75 ? "text-chart-3" :
                        equipment.healthIndex >= 50 ? "text-chart-2" : "text-destructive"
                      }`}>
                        Health: {equipment.healthIndex}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Maint. due: {equipment.predictedDueDays} days
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Latest Telemetry Readings (Option A extension) */}
        <Card className="bg-card border border-border">
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Latest Telemetry Readings</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Real-time sensor data {selectedVessel !== "all" ? `from ${selectedVessel}` : "from all vessels"}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipment ID</TableHead>
                    <TableHead>Sensor Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {latestReadingsLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Loading latest readings...
                      </TableCell>
                    </TableRow>
                  ) : latestReadings && latestReadings.length > 0 ? (
                    latestReadings.slice(0, 10).map((reading, index) => (
                      <TableRow 
                        key={`${reading.equipmentId}-${reading.sensorType}-${index}`} 
                        className="hover:bg-muted"
                        data-testid={`telemetry-row-${reading.equipmentId}-${reading.sensorType}-${index}`}
                      >
                        <TableCell className="font-mono text-sm" data-testid={`reading-equipment-${reading.equipmentId}`}>
                          {reading.equipmentId}
                        </TableCell>
                        <TableCell data-testid={`reading-sensor-${reading.sensorType}`}>
                          {reading.sensorType}
                        </TableCell>
                        <TableCell className="font-medium" data-testid={`reading-value-${reading.value}`}>
                          {reading.value?.toFixed(2) || "–"}
                        </TableCell>
                        <TableCell data-testid={`reading-unit-${reading.unit}`}>
                          {reading.unit || "–"}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            reading.status === 'normal' ? "bg-chart-3/20 text-chart-3" :
                            reading.status === 'warning' ? "bg-chart-2/20 text-chart-2" :
                            reading.status === 'critical' ? "bg-destructive/20 text-destructive" :
                            "bg-muted text-muted-foreground"
                          }`}>
                            {reading.status?.toUpperCase() || "UNKNOWN"}
                          </span>
                        </TableCell>
                        <TableCell data-testid={`reading-timestamp-${reading.ts}`}>
                          {reading.ts 
                            ? formatDistanceToNow(new Date(reading.ts), { addSuffix: true })
                            : "Never"
                          }
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No telemetry readings available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Work Orders and Reports */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Work Orders */}
          <Card className="lg:col-span-2 bg-card border border-border">
            <CardHeader className="border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">Recent Work Orders</CardTitle>
                  <p className="text-sm text-muted-foreground">Latest maintenance requests and updates</p>
                </div>
                <Button 
                  variant="secondary" 
                  size="sm"
                  data-testid="button-new-work-order"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Order
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Equipment</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ordersLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          Loading work orders...
                        </TableCell>
                      </TableRow>
                    ) : (
                      workOrders?.slice(0, 5).map((order) => (
                        <TableRow key={order.id} className="hover:bg-muted">
                          <TableCell className="font-mono text-sm" data-testid={`order-id-${order.id}`}>
                            {order.id}
                          </TableCell>
                          <TableCell data-testid={`order-equipment-${order.id}`}>
                            {order.equipmentId}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              order.priority === 1 ? "bg-destructive/20 text-destructive" :
                              order.priority === 2 ? "bg-chart-2/20 text-chart-2" :
                              "bg-chart-3/20 text-chart-3"
                            }`}>
                              {order.priority === 1 ? "High" : order.priority === 2 ? "Medium" : "Low"}
                            </span>
                          </TableCell>
                          <TableCell data-testid={`order-status-${order.id}`}>
                            {order.status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                          </TableCell>
                          <TableCell data-testid={`order-created-${order.id}`}>
                            {order.createdAt 
                              ? formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })
                              : "Unknown"
                            }
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              data-testid={`button-view-order-${order.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions and System Info */}
          <div className="space-y-6">
            <Card className="bg-card border border-border">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90" 
                  data-testid="button-generate-report"
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Generate Health Report
                </Button>
                <Button 
                  variant="secondary" 
                  className="w-full"
                  data-testid="button-schedule-inspection"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Schedule Inspection
                </Button>
                <Button 
                  variant="secondary" 
                  className="w-full"
                  data-testid="button-export-data"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Export Data
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-card border border-border">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">System Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">API Version</span>
                  <span className="text-foreground font-mono" data-testid="text-api-version">v1.0.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Database</span>
                  <span className="text-chart-3">Memory Connected</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Devices</span>
                  <span className="text-foreground" data-testid="text-active-devices">
                    {metrics?.activeDevices || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Refresh</span>
                  <span className="text-foreground" data-testid="text-last-refresh">Just now</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
