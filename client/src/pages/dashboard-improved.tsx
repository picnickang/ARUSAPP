import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Cpu, Heart, Wrench, AlertTriangle, Eye, Plus, Ship, Activity, FileText, ClipboardCheck, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricCard } from "@/components/metric-card";
import { StatusIndicator } from "@/components/status-indicator";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { DashboardTabs } from "@/components/dashboard-tabs";
import { useFocusMode } from "@/contexts/FocusModeContext";
import { 
  fetchDashboardMetrics, 
  fetchDevices, 
  fetchEquipmentHealth, 
  fetchWorkOrders,
  fetchLatestTelemetryReadings,
  fetchDtcDashboardStats
} from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { queryClient, CACHE_TIMES } from "@/lib/queryClient";
import { formatTimeSgt } from "@/lib/time-utils";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { InsightsOverview } from "@/components/InsightsOverview";
import { OperatingConditionAlertsPanel } from "@/components/OperatingConditionAlertsPanel";
import { useDashboardPreferences } from "@/hooks/useDashboardPreferences";

export default function DashboardImproved() {
  const [alertBanner, setAlertBanner] = useState<any>(null);
  const { toast } = useToast();
  const { isFocusMode, toggleFocusMode } = useFocusMode();
  const { preferences, updatePreference } = useDashboardPreferences();
  const [selectedVessel, setSelectedVessel] = useState<string>(preferences.vesselFilter);
  const [, setLocation] = useLocation();
  
  // Local state for collapsible sections - responds to focus mode
  const [deviceStatusExpanded, setDeviceStatusExpanded] = useState(true);
  const [telemetryExpanded, setTelemetryExpanded] = useState(false);
  const [predictiveMaintenanceExpanded, setPredictiveMaintenanceExpanded] = useState(true);
  const [workOrdersExpanded, setWorkOrdersExpanded] = useState(true);
  
  // WebSocket connection for real-time updates
  const { isConnected, latestAlert, subscribe, unsubscribe } = useWebSocket({
    autoConnect: true
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/dashboard"],
    queryFn: fetchDashboardMetrics,
    refetchInterval: CACHE_TIMES.REALTIME,
    staleTime: CACHE_TIMES.REALTIME,
  });

  const { data: devices, isLoading: devicesLoading } = useQuery({
    queryKey: ["/api/devices"],
    queryFn: fetchDevices,
    refetchInterval: CACHE_TIMES.MODERATE,
    staleTime: CACHE_TIMES.MODERATE,
  });

  const { data: equipmentHealth, isLoading: healthLoading } = useQuery({
    queryKey: ["/api/equipment/health"],
    queryFn: fetchEquipmentHealth,
    refetchInterval: CACHE_TIMES.REALTIME,
    staleTime: CACHE_TIMES.REALTIME,
  });

  const { data: workOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/work-orders"],
    queryFn: () => fetchWorkOrders(),
    refetchInterval: CACHE_TIMES.MODERATE,
    staleTime: CACHE_TIMES.MODERATE,
  });

  const { data: allVessels = [] } = useQuery({
    queryKey: ["/api/vessels"],
    refetchInterval: CACHE_TIMES.STABLE,
    staleTime: CACHE_TIMES.STABLE,
  });

  const { data: equipmentRegistry = [] } = useQuery({
    queryKey: ["/api/equipment"],
    refetchInterval: CACHE_TIMES.STABLE,
    staleTime: CACHE_TIMES.STABLE,
  });

  const { data: latestReadings, isLoading: latestReadingsLoading } = useQuery({
    queryKey: ["/api/telemetry/latest", selectedVessel],
    queryFn: () => fetchLatestTelemetryReadings(
      selectedVessel === "all" ? undefined : selectedVessel,
      undefined,
      undefined,
      50
    ),
    refetchInterval: CACHE_TIMES.REALTIME,
    staleTime: CACHE_TIMES.REALTIME,
  });

  const { data: dtcStats } = useQuery({
    queryKey: ["/api/dtc/dashboard-stats"],
    queryFn: fetchDtcDashboardStats,
    refetchInterval: CACHE_TIMES.REALTIME,
    staleTime: CACHE_TIMES.REALTIME,
  });

  const currentTime = formatTimeSgt(new Date()) + " SGT";
  const vessels = allVessels?.map(vessel => vessel.name) || [];

  // Helper function to get equipment name by ID
  const getEquipmentName = (equipmentId: string | null | undefined): string => {
    if (!equipmentId) return "Unknown";
    const healthItem = equipmentHealth?.find(eq => eq.id === equipmentId);
    if (healthItem?.name) return healthItem.name;
    const equipment = equipmentRegistry?.find(eq => eq.id === equipmentId);
    if (equipment?.name) return equipment.name;
    return equipmentId;
  };

  // Helper function to get priority display text
  const getPriorityText = (priority: any): string => {
    if (priority === null || priority === undefined) return 'N/A';
    const priorityStr = String(priority).toLowerCase();
    if (priorityStr === 'high' || priorityStr === '2') return 'HIGH';
    if (priorityStr === 'medium' || priorityStr === '1') return 'MEDIUM';
    if (priorityStr === 'low' || priorityStr === '0') return 'LOW';
    return String(priority).toUpperCase();
  };

  // Calculate critical issues count
  const criticalEquipmentCount = equipmentHealth?.filter(eq => eq.healthIndex < 30).length || 0;
  const criticalWorkOrdersCount = workOrders?.filter(wo => 
    (wo.priority === 'high' || wo.priority === '2' || wo.priority === 2) && wo.status !== 'completed'
  ).length || 0;
  const totalCriticalIssues = criticalEquipmentCount + criticalWorkOrdersCount + (metrics?.riskAlerts || 0);

  // Subscribe to alerts
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

  // Handle alerts
  useEffect(() => {
    if (latestAlert && !latestAlert.acknowledged) {
      setAlertBanner(latestAlert);
      const alertType = latestAlert.alertType || (latestAlert as any).type || 'info';
      const isMaintenanceAlert = (latestAlert as any).type === 'maintenance_scheduled';
      toast({
        title: isMaintenanceAlert ? 'Maintenance Scheduled' : `${alertType.toUpperCase()} Alert`,
        description: latestAlert.message,
        variant: alertType === 'critical' ? 'destructive' : 'default',
      });
      if (alertType !== 'critical') {
        setTimeout(() => setAlertBanner(null), 10000);
      }
    }
  }, [latestAlert, toast]);

  const refreshData = () => {
    toast({
      title: "Refreshing data...",
      description: "Dashboard data is being updated",
    });
    queryClient.invalidateQueries();
    setTimeout(() => {
      toast({
        title: "Data refreshed",
        description: "Dashboard updated successfully",
      });
    }, 500);
  };

  const dismissAlert = () => setAlertBanner(null);

  // Update preferences when vessel filter changes
  useEffect(() => {
    updatePreference('vesselFilter', selectedVessel);
  }, [selectedVessel, updatePreference]);

  // Update collapsible sections when focus mode changes
  useEffect(() => {
    if (isFocusMode) {
      setDeviceStatusExpanded(false);
      setTelemetryExpanded(false);
      setPredictiveMaintenanceExpanded(criticalEquipmentCount > 0);
      setWorkOrdersExpanded(criticalWorkOrdersCount > 0);
    } else {
      setDeviceStatusExpanded(true);
      setTelemetryExpanded(false);
      setPredictiveMaintenanceExpanded(true);
      setWorkOrdersExpanded(true);
    }
  }, [isFocusMode]);

  // Filter content based on focus mode
  const shouldShowSection = (sectionType: 'critical' | 'normal') => {
    if (!isFocusMode) return true;
    return sectionType === 'critical';
  };

  // Critical equipment for focus mode
  const criticalEquipment = equipmentHealth?.filter(eq => eq.healthIndex < 30) || [];
  const criticalWorkOrders = workOrders?.filter(wo => 
    (wo.priority === 'high' || wo.priority === '2' || wo.priority === 2) && wo.status !== 'completed'
  ) || [];

  if (metricsLoading) {
    return (
      <div className="space-y-6">
        <header className="bg-card border-b border-border px-4 lg:px-6 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-96" />
            </div>
            <div className="flex items-center space-x-4">
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        </header>
        <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6">
            {[...Array(5)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Overview Tab Content
  const overviewContent = (
    <>
      {shouldShowSection('normal') && <InsightsOverview orgId="default-org-id" scope="fleet" />}
      {shouldShowSection('critical') && totalCriticalIssues > 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Critical Issues Requiring Attention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {criticalEquipmentCount > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Critical Equipment ({criticalEquipmentCount})</h3>
                <div className="space-y-2">
                  {criticalEquipment.slice(0, 5).map(eq => (
                    <div key={eq.id} className="flex items-center justify-between p-2 bg-background rounded">
                      <span>{eq.name || eq.id}</span>
                      <span className="text-destructive font-semibold">Health: {eq.healthIndex}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {criticalWorkOrdersCount > 0 && (
              <div>
                <h3 className="font-semibold mb-2">High Priority Work Orders ({criticalWorkOrdersCount})</h3>
                <div className="space-y-2">
                  {criticalWorkOrders.slice(0, 5).map(wo => (
                    <div key={wo.id} className="flex items-center justify-between p-2 bg-background rounded">
                      <span>{wo.title}</span>
                      <span className="text-destructive font-semibold">{wo.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      {shouldShowSection('normal') && <OperatingConditionAlertsPanel />}
    </>
  );

  // Devices Tab Content
  const devicesContent = (
    <>
      {shouldShowSection('normal') && (
      <CollapsibleSection
        title="Device Status"
        description="Real-time edge device monitoring"
        icon={<Cpu className="h-5 w-5" />}
        expanded={deviceStatusExpanded}
        onExpandedChange={setDeviceStatusExpanded}
        summary={`${devices?.filter(d => d.status === 'online').length || 0} online, ${devices?.filter(d => d.status === 'offline').length || 0} offline`}
        data-testid="collapsible-device-status"
      >
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
      </CollapsibleSection>
      )}

      {shouldShowSection('normal') && (
      <CollapsibleSection
        title="Latest Telemetry Readings"
        description={`Real-time sensor data ${selectedVessel !== "all" ? `from ${selectedVessel}` : "from all vessels"}`}
        icon={<Activity className="h-5 w-5" />}
        expanded={telemetryExpanded}
        onExpandedChange={setTelemetryExpanded}
        summary={latestReadings ? `${latestReadings.length} readings available` : "No data"}
        data-testid="collapsible-telemetry"
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipment</TableHead>
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
                  >
                    <TableCell className="font-medium">
                      {getEquipmentName(reading.equipmentId)}
                    </TableCell>
                    <TableCell>{reading.sensorType}</TableCell>
                    <TableCell className="font-medium">
                      {reading.value?.toFixed(2) || "–"}
                    </TableCell>
                    <TableCell>{reading.unit || "–"}</TableCell>
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
                    <TableCell>
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
      </CollapsibleSection>
      )}
    </>
  );

  // Maintenance Tab Content
  const maintenanceContent = (
    <>
      <CollapsibleSection
        title="Predictive Maintenance"
        description="Equipment health and failure predictions"
        icon={<Heart className="h-5 w-5" />}
        expanded={predictiveMaintenanceExpanded}
        onExpandedChange={setPredictiveMaintenanceExpanded}
        summary={`${criticalEquipmentCount} critical, ${equipmentHealth?.filter(eq => eq.healthIndex >= 30 && eq.healthIndex < 70).length || 0} warning`}
        data-testid="collapsible-predictive-maintenance"
      >
        <div className="space-y-0">
          {healthLoading ? (
            <div className="text-center text-muted-foreground py-4">Loading equipment health...</div>
          ) : (
            (isFocusMode ? criticalEquipment : equipmentHealth)?.map((equipment, index) => (
              <div 
                key={equipment.id} 
                className={`flex flex-wrap items-center gap-3 py-2.5 px-1 border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors ${
                  equipment.healthIndex < 50 ? 'bg-destructive/5' : ''
                }`}
                data-testid={`equipment-${equipment.id}`}
              >
                <StatusIndicator status={equipment.status} />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-foreground truncate">{equipment.name || equipment.id}</span>
                  <span className="text-xs text-muted-foreground ml-2 truncate">• {equipment.vessel}</span>
                </div>
                <div className="flex items-center gap-3 sm:gap-4 text-sm flex-shrink-0">
                  <div className="text-right">
                    <span className={`font-medium ${
                      equipment.healthIndex >= 75 ? "text-chart-3" :
                      equipment.healthIndex >= 50 ? "text-chart-2" : "text-destructive"
                    }`}>
                      {equipment.healthIndex}%
                    </span>
                  </div>
                  <div className="text-right min-w-[50px]">
                    <span className="text-xs text-muted-foreground">
                      {equipment.predictedDueDays}d
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Work Orders"
        description="Latest maintenance requests and updates"
        icon={<Wrench className="h-5 w-5" />}
        expanded={workOrdersExpanded}
        onExpandedChange={setWorkOrdersExpanded}
        summary={`${workOrders?.filter(wo => wo.status !== 'completed').length || 0} open, ${criticalWorkOrdersCount} high priority`}
        headerAction={
          <Button 
            variant="secondary" 
            size="sm"
            data-testid="button-new-work-order"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Order
          </Button>
        }
        data-testid="collapsible-work-orders"
      >
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
                (isFocusMode ? criticalWorkOrders : workOrders?.slice(0, 10))?.map((order) => (
                  <TableRow key={order.id} className="hover:bg-muted">
                    <TableCell className="font-mono text-sm" data-testid={`work-order-id-${order.id}`}>
                      {order.workOrderNumber || order.id}
                    </TableCell>
                    <TableCell data-testid={`work-order-equipment-${order.id}`}>
                      {getEquipmentName(order.equipmentId)}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        order.priority === 'high' || order.priority === '2' || order.priority === 2 ? "bg-destructive/20 text-destructive" :
                        order.priority === 'medium' || order.priority === '1' || order.priority === 1 ? "bg-amber-500/20 text-amber-600 dark:text-amber-400" :
                        "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                      }`}>
                        {getPriorityText(order.priority)}
                      </span>
                    </TableCell>
                    <TableCell data-testid={`work-order-status-${order.id}`}>
                      {order.status}
                    </TableCell>
                    <TableCell data-testid={`work-order-created-${order.id}`}>
                      {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CollapsibleSection>
    </>
  );

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {alertBanner && (
        <div 
          className={`mx-4 lg:mx-6 mt-4 lg:mt-6 p-3 lg:p-4 rounded-lg border-l-4 ${
            alertBanner.alertType === 'critical' 
              ? 'bg-destructive/10 border-destructive text-destructive-foreground' 
              : 'bg-yellow-500/10 border-yellow-500 text-yellow-700 dark:text-yellow-300'
          }`}
          data-testid="alert-banner"
        >
          <div className="flex items-start justify-between space-x-3">
            <div className="flex items-start space-x-3 flex-1 min-w-0">
              <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm lg:text-base break-words">
                  {alertBanner.alertType?.toUpperCase()} ALERT - {getEquipmentName(alertBanner.equipmentId)}
                </p>
                <p className="text-sm opacity-90 break-words">{alertBanner.message}</p>
                <p className="text-xs opacity-75 mt-1">
                  {formatDistanceToNow(new Date(alertBanner.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={dismissAlert} data-testid="button-dismiss-alert">
              <AlertTriangle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

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
                  {vessels.map((vessel, index) => (
                    <SelectItem key={`${vessel}-${index}`} value={vessel} data-testid={`vessel-option-${vessel}`}>
                      {vessel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Focus Mode Toggle */}
            <Button
              onClick={toggleFocusMode}
              variant={isFocusMode ? "default" : "outline"}
              className="w-full lg:w-auto"
              data-testid="button-focus-mode"
            >
              <Target className="mr-2 h-4 w-4" />
              {isFocusMode ? "Exit Focus Mode" : "Focus Mode"}
            </Button>

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
        {/* Metrics Overview - Always Visible */}
        <div className="mobile-scroll-container lg:overflow-visible">
          <div className="mobile-scroll-items lg:grid lg:grid-cols-5 lg:gap-6">
            <div className="mobile-scroll-item">
              <MetricCard
                title="Active Devices"
                value={metrics?.activeDevices || 0}
                icon={Cpu}
                variant={preferences.metricsVariant}
                trend={metrics?.trends?.activeDevices ? {
                  value: `${metrics.trends.activeDevices.value}`,
                  label: `${metrics.trends.activeDevices.direction === 'up' ? 'more' : 'fewer'} than last week`,
                  direction: metrics.trends.activeDevices.direction,
                  color: metrics.trends.activeDevices.direction === 'up' ? 'success' : 'warning'
                } : undefined}
              />
            </div>
            
            <div className="mobile-scroll-item">
              <MetricCard
                title="Fleet Health"
                value={`${metrics?.fleetHealth || 0}%`}
                icon={Heart}
                variant={preferences.metricsVariant}
                progress={{
                  value: metrics?.fleetHealth || 0,
                  color: (metrics?.fleetHealth || 0) >= 80 ? 'success' : (metrics?.fleetHealth || 0) >= 60 ? 'warning' : 'danger'
                }}
                trend={metrics?.trends?.fleetHealth ? {
                  value: `${metrics.trends.fleetHealth.percentChange}%`,
                  label: "from last week",
                  direction: metrics.trends.fleetHealth.direction,
                  color: metrics.trends.fleetHealth.direction === 'up' ? 'success' : 'warning'
                } : undefined}
              />
            </div>
            
            <div className="mobile-scroll-item">
              <MetricCard
                title="Open Work Orders"
                value={metrics?.openWorkOrders || 0}
                icon={Wrench}
                variant={preferences.metricsVariant}
                trend={metrics?.trends?.openWorkOrders ? {
                  value: `${metrics.trends.openWorkOrders.value}`,
                  label: `${metrics.trends.openWorkOrders.direction === 'up' ? 'more' : 'fewer'} than last week`,
                  direction: metrics.trends.openWorkOrders.direction,
                  color: metrics.trends.openWorkOrders.direction === 'up' ? 'warning' : 'success'
                } : undefined}
              />
            </div>
            
            <div className="mobile-scroll-item">
              <MetricCard
                title="Risk Alerts"
                value={metrics?.riskAlerts || 0}
                icon={AlertTriangle}
                variant={preferences.metricsVariant}
                trend={metrics?.trends?.riskAlerts ? {
                  value: `${metrics.trends.riskAlerts.value}`,
                  label: `${metrics.trends.riskAlerts.direction === 'up' ? 'more' : 'fewer'} than last week`,
                  direction: metrics.trends.riskAlerts.direction,
                  color: metrics.trends.riskAlerts.direction === 'up' ? 'danger' : 'success'
                } : undefined}
              />
            </div>

            <div className="mobile-scroll-item">
              <MetricCard
                title="Diagnostic Codes"
                value={dtcStats?.totalActiveDtcs || 0}
                icon={Activity}
                variant={preferences.metricsVariant}
                trend={{
                  value: `${dtcStats?.criticalDtcs || 0}`,
                  label: "critical DTCs",
                  direction: dtcStats?.criticalDtcs ? "up" : undefined,
                  color: dtcStats?.criticalDtcs ? "danger" : "success"
                }}
              />
            </div>
          </div>
        </div>

        {/* Tabbed Content */}
        <DashboardTabs
          overviewContent={overviewContent}
          devicesContent={devicesContent}
          maintenanceContent={maintenanceContent}
        />
      </div>
    </div>
  );
}
