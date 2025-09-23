import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { RefreshCw, TrendingUp, Calendar, Filter, Activity, BarChart, Wifi, WifiOff, Radio, DollarSign, AlertTriangle, Wrench, Target, PieChart, Clock, Settings, Search, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart as RechartsBarChart, Bar, AreaChart, Area, PieChart as RechartsPieChart, Cell } from "recharts";
import { fetchTelemetryTrends, fetchTelemetryHistory, fetchDevices } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/useWebSocket";
import { formatDistanceToNow, format } from "date-fns";

export default function Analytics() {
  // Basic filters
  const [selectedEquipment, setSelectedEquipment] = useState<string>("all");
  const [selectedSensorType, setSelectedSensorType] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<number>(24);
  const [chartType, setChartType] = useState<"line" | "area" | "bar">("line");
  const [liveTelemetryCount, setLiveTelemetryCount] = useState(0);

  // Advanced filters
  const [searchText, setSearchText] = useState<string>("");
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>([]);
  const [selectedStatusFilters, setSelectedStatusFilters] = useState<string[]>([]);
  const [selectedSensorTypes, setSelectedSensorTypes] = useState<string[]>([]);
  const [customDateRange, setCustomDateRange] = useState<{start: Date | null; end: Date | null}>({
    start: null,
    end: null
  });
  const [useCustomDateRange, setUseCustomDateRange] = useState(false);
  const [aggregationType, setAggregationType] = useState<"average" | "min" | "max" | "current">("current");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // WebSocket connection for real-time updates
  const { 
    isConnected, 
    isConnecting, 
    latestTelemetry, 
    subscribe, 
    connectionCount 
  } = useWebSocket();

  const { data: telemetryTrends, isLoading: trendsLoading } = useQuery({
    queryKey: ["/api/telemetry/trends"],
    queryFn: fetchTelemetryTrends,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: devices, isLoading: devicesLoading } = useQuery({
    queryKey: ["/api/devices"],
    queryFn: fetchDevices,
    refetchInterval: 60000,
  });

  // Calculate effective range hours for stable query key
  const effectiveRangeHours = useCustomDateRange && customDateRange.start && customDateRange.end
    ? Math.ceil((customDateRange.end.getTime() - customDateRange.start.getTime()) / (1000 * 60 * 60))
    : timeRange;

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ["/api/telemetry/history", selectedEquipment, selectedSensorType, effectiveRangeHours],
    queryFn: () => {
      if (selectedEquipment !== "all" && selectedSensorType !== "all") {
        return fetchTelemetryHistory(selectedEquipment, selectedSensorType, effectiveRangeHours);
      }
      return Promise.resolve([]);
    },
    enabled: selectedEquipment !== "all" && selectedSensorType !== "all",
    refetchInterval: 30000,
  });

  // Maintenance Analytics Queries with explicit fetch functions
  const { data: costTrends, isLoading: costTrendsLoading } = useQuery({
    queryKey: ["/api/analytics/cost-trends"],
    queryFn: async () => {
      const response = await fetch("/api/analytics/cost-trends");
      if (!response.ok) throw new Error("Failed to fetch cost trends");
      return response.json();
    },
    refetchInterval: 60000,
  });

  const { data: costSummary, isLoading: costSummaryLoading } = useQuery({
    queryKey: ["/api/analytics/cost-summary"],
    queryFn: async () => {
      const response = await fetch("/api/analytics/cost-summary");
      if (!response.ok) throw new Error("Failed to fetch cost summary");
      return response.json();
    },
    refetchInterval: 60000,
  });

  const { data: fleetPerformance, isLoading: fleetPerformanceLoading } = useQuery({
    queryKey: ["/api/analytics/fleet-performance"],
    queryFn: async () => {
      const response = await fetch("/api/analytics/fleet-performance");
      if (!response.ok) throw new Error("Failed to fetch fleet performance");
      return response.json();
    },
    refetchInterval: 60000,
  });

  const { data: replacementRecommendations, isLoading: replacementLoading } = useQuery({
    queryKey: ["/api/analytics/replacement-recommendations"],
    queryFn: async () => {
      const response = await fetch("/api/analytics/replacement-recommendations");
      if (!response.ok) throw new Error("Failed to fetch replacement recommendations");
      return response.json();
    },
    refetchInterval: 300000, // 5 minutes
  });

  const { data: maintenanceRecords, isLoading: recordsLoading } = useQuery({
    queryKey: ["/api/analytics/maintenance-records"],
    queryFn: async () => {
      const response = await fetch("/api/analytics/maintenance-records");
      if (!response.ok) throw new Error("Failed to fetch maintenance records");
      return response.json();
    },
    refetchInterval: 60000,
  });

  // PdM Analytics Queries
  const { data: pdmScores, isLoading: pdmScoresLoading } = useQuery({
    queryKey: ["/api/pdm/scores"],
    queryFn: async () => {
      const response = await fetch("/api/pdm/scores");
      if (!response.ok) throw new Error("Failed to fetch PdM scores");
      return response.json();
    },
    refetchInterval: 30000,
  });

  const { data: equipmentHealth, isLoading: equipmentHealthLoading } = useQuery({
    queryKey: ["/api/equipment/health"],
    queryFn: async () => {
      const response = await fetch("/api/equipment/health");
      if (!response.ok) throw new Error("Failed to fetch equipment health");
      return response.json();
    },
    refetchInterval: 30000,
  });

  // Subscribe to telemetry channel on mount
  useEffect(() => {
    if (isConnected) {
      subscribe('telemetry');
    }
  }, [isConnected, subscribe]);

  // Update live telemetry count and charts when new data arrives
  useEffect(() => {
    if (latestTelemetry) {
      setLiveTelemetryCount(prev => prev + 1);
      
      // Update history chart data if it matches current selection
      if (selectedEquipment !== "all" && selectedSensorType !== "all" &&
          latestTelemetry.equipmentId === selectedEquipment && 
          latestTelemetry.sensorType === selectedSensorType) {
        
        const newDataPoint = {
          time: format(new Date(latestTelemetry.timestamp), "HH:mm"),
          fullTime: latestTelemetry.timestamp,
          value: latestTelemetry.value,
          threshold: latestTelemetry.threshold,
          status: latestTelemetry.status,
          unit: latestTelemetry.unit,
        };
        
        // Update React Query cache with new data point
        queryClient.setQueryData(
          ["/api/telemetry/history", selectedEquipment, selectedSensorType, effectiveRangeHours],
          (oldData: any[]) => {
            if (!oldData) return [newDataPoint];
            const updatedData = [...oldData, newDataPoint];
            // Keep only data within time range and limit to reasonable chart size
            const timeThreshold = new Date(Date.now() - effectiveRangeHours * 60 * 60 * 1000);
            return updatedData
              .filter(item => new Date(item.fullTime) >= timeThreshold)
              .slice(-100); // Keep last 100 points for performance
          }
        );
      }
      
      // Throttled cache invalidation for trends (every 3 seconds)
      const now = Date.now();
      if (!(window as any).lastTrendsInvalidation || now - (window as any).lastTrendsInvalidation > 3000) {
        queryClient.invalidateQueries({ queryKey: ["/api/telemetry/trends"] });
        (window as any).lastTrendsInvalidation = now;
      }
    }
  }, [latestTelemetry, selectedEquipment, selectedSensorType, timeRange]);

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/telemetry/trends"] });
    if (selectedEquipment !== "all" && selectedSensorType !== "all") {
      queryClient.invalidateQueries({ queryKey: ["/api/telemetry/history"] });
    }
  };

  // Process data for charts
  const processedTrends = telemetryTrends?.reduce((acc, reading) => {
    const key = `${reading.equipmentId}-${reading.sensorType}`;
    if (!acc[key]) {
      // Get the most recent timestamp from the data array
      const mostRecentData = reading.data?.[0]; // data is already sorted by newest first
      acc[key] = {
        name: `${reading.equipmentId} ${reading.sensorType}`,
        equipmentId: reading.equipmentId,
        sensorType: reading.sensorType,
        value: reading.currentValue || mostRecentData?.value || 0,
        unit: reading.unit,
        status: reading.status,
        lastReading: mostRecentData?.ts || new Date().toISOString(),
      };
    }
    return acc;
  }, {} as Record<string, any>);

  const trendsArray = processedTrends ? Object.values(processedTrends) : [];

  // Apply advanced filtering to trends data
  const filteredTrendsArray = trendsArray.filter((trend: any) => {
    // Search text filter
    if (searchText && !trend.name.toLowerCase().includes(searchText.toLowerCase()) &&
        !trend.equipmentId.toLowerCase().includes(searchText.toLowerCase()) &&
        !trend.sensorType.toLowerCase().includes(searchText.toLowerCase())) {
      return false;
    }
    
    // Multi-equipment filter
    if (selectedEquipmentIds.length > 0 && !selectedEquipmentIds.includes(trend.equipmentId)) {
      return false;
    }
    
    // Status filter
    if (selectedStatusFilters.length > 0 && !selectedStatusFilters.includes(trend.status)) {
      return false;
    }
    
    // Sensor type filter for advanced selection
    if (selectedSensorTypes.length > 0 && !selectedSensorTypes.includes(trend.sensorType)) {
      return false;
    }
    
    return true;
  });

  // Process history data for time-series chart with optimized aggregation
  const processedHistory = useMemo(() => {
    if (!historyData?.length) return [];
    
    // Calculate aggregated value once for performance
    let aggregatedValue = null;
    if (aggregationType !== "current" && historyData.length > 1) {
      const allValues = historyData.map(r => r.value).filter(v => v !== null && v !== undefined);
      if (allValues.length > 0) {
        switch (aggregationType) {
          case "average":
            aggregatedValue = allValues.reduce((sum, val) => sum + val, 0) / allValues.length;
            break;
          case "min":
            aggregatedValue = Math.min(...allValues);
            break;
          case "max":
            aggregatedValue = Math.max(...allValues);
            break;
        }
      }
    }
    
    return historyData.map(reading => ({
      time: format(new Date(reading.ts!), "HH:mm"),
      fullTime: reading.ts,
      value: aggregationType !== "current" && aggregatedValue !== null ? aggregatedValue : reading.value,
      threshold: reading.threshold,
      status: reading.status,
      unit: reading.unit,
    }));
  }, [historyData, aggregationType]);

  // Apply custom date range filtering to processed history if enabled
  const filteredHistory = useCustomDateRange && customDateRange.start && customDateRange.end
    ? processedHistory.filter(item => {
        const itemTime = new Date(item.fullTime);
        return itemTime >= customDateRange.start! && itemTime <= customDateRange.end!;
      })
    : processedHistory;

  // Get unique equipment IDs and sensor types
  const equipmentIds = Array.from(new Set(telemetryTrends?.map(t => t.equipmentId) || []));
  const sensorTypes = Array.from(new Set(telemetryTrends?.map(t => t.sensorType) || []));

  const getStatusColor = (status: string) => {
    switch (status) {
      case "normal": return "bg-green-500";
      case "warning": return "bg-yellow-500";
      case "critical": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const currentTime = new Date().toLocaleTimeString("en-US", {
    timeZone: "UTC",
    hour12: false,
  }) + " UTC";

  if (trendsLoading || devicesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading analytics...</div>
      </div>
    );
  }

  const renderChart = () => {
    if (historyLoading) {
      return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading chart data...</div>;
    }

    if (processedHistory.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Select equipment and sensor type to view historical data
        </div>
      );
    }

    if (filteredHistory.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          No data matches the selected filters or date range. Try adjusting your criteria.
        </div>
      );
    }

    const ChartComponent = chartType === "line" ? LineChart : chartType === "area" ? AreaChart : RechartsBarChart;

    return (
      <ResponsiveContainer width="100%" height={400}>
        <ChartComponent data={filteredHistory}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            label={{ value: processedHistory[0]?.unit || 'Value', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            labelFormatter={(label) => `Time: ${label}`}
            formatter={(value, name) => [value, name]}
          />
          <Legend />
          
          {chartType === "line" && (
            <>
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Sensor Value"
                dot={{ r: 3 }}
              />
              <Line 
                type="monotone" 
                dataKey="threshold" 
                stroke="#ef4444" 
                strokeDasharray="5 5"
                name="Threshold"
                dot={false}
              />
            </>
          )}
          
          {chartType === "area" && (
            <>
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#3b82f6" 
                fill="#3b82f6" 
                fillOpacity={0.3}
                name="Sensor Value"
              />
              <Line 
                type="monotone" 
                dataKey="threshold" 
                stroke="#ef4444" 
                strokeDasharray="5 5"
                name="Threshold"
                dot={false}
              />
            </>
          )}
          
          {chartType === "bar" && (
            <Bar 
              dataKey="value" 
              fill="#3b82f6"
              name="Sensor Value"
            />
          )}
        </ChartComponent>
      </ResponsiveContainer>
    );
  };

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];

  const costTrendsData = costTrends?.map((trend: any) => ({
    month: trend.month,
    totalCost: trend.totalCost,
    labor: trend.costByType.labor || 0,
    parts: trend.costByType.parts || 0,
    equipment: trend.costByType.equipment || 0,
    downtime: trend.costByType.downtime || 0,
  })) || [];

  const costBreakdownData = costSummary?.reduce((acc: any[], summary: any) => {
    Object.entries(summary.costByType).forEach(([type, amount]) => {
      const existing = acc.find((item: any) => item.name === type);
      if (existing) {
        existing.value += amount;
      } else {
        acc.push({ name: type, value: amount });
      }
    });
    return acc;
  }, [] as { name: string; value: number }[]) || [];

  const performanceData = fleetPerformance?.map((perf: any) => ({
    equipmentId: perf.equipmentId,
    performance: Math.round(perf.averageScore),
    reliability: Math.round(perf.reliability * 100),
    availability: Math.round(perf.availability * 100),
    efficiency: Math.round(perf.efficiency * 100),
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Analytics Dashboard</h2>
            <p className="text-muted-foreground">Comprehensive telemetry and maintenance analytics</p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Live Connection Status */}
            <div className="flex items-center space-x-2">
              {isConnecting ? (
                <div className="flex items-center text-yellow-500">
                  <Radio className="mr-1 h-4 w-4 animate-pulse" />
                  <span className="text-xs">Connecting...</span>
                </div>
              ) : isConnected ? (
                <div className="flex items-center text-green-500">
                  <Wifi className="mr-1 h-4 w-4" />
                  <span className="text-xs">Live</span>
                  {liveTelemetryCount > 0 && (
                    <Badge variant="secondary" className="ml-1 px-1 py-0 text-xs">
                      +{liveTelemetryCount}
                    </Badge>
                  )}
                </div>
              ) : (
                <div className="flex items-center text-red-500">
                  <WifiOff className="mr-1 h-4 w-4" />
                  <span className="text-xs">Offline</span>
                </div>
              )}
            </div>
            
            <Button 
              onClick={refreshData}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              data-testid="button-refresh"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Data
            </Button>
            <div className="flex items-center text-sm text-muted-foreground">
              <span data-testid="text-current-time">{currentTime}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="px-6 space-y-6">
        {/* Analytics Tabs */}
        <Tabs defaultValue="telemetry" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="telemetry" data-testid="tab-telemetry">
              <Activity className="mr-2 h-4 w-4" />
              Telemetry Analytics
            </TabsTrigger>
            <TabsTrigger value="maintenance" data-testid="tab-maintenance">
              <Wrench className="mr-2 h-4 w-4" />
              Maintenance Analytics
            </TabsTrigger>
            <TabsTrigger value="performance" data-testid="tab-performance">
              <Target className="mr-2 h-4 w-4" />
              Fleet Performance
            </TabsTrigger>
            <TabsTrigger value="predictive" data-testid="tab-predictive">
              <TrendingUp className="mr-2 h-4 w-4" />
              Predictive Analytics
            </TabsTrigger>
          </TabsList>

          {/* Telemetry Analytics Tab */}
          <TabsContent value="telemetry" className="space-y-6 mt-6">
            {/* Enhanced Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Filter className="mr-2 h-5 w-5" />
                Analytics Controls
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                data-testid="button-toggle-advanced"
              >
                <Settings className="mr-2 h-4 w-4" />
                {showAdvancedFilters ? "Hide" : "Show"} Advanced
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search equipment, sensors, or descriptions..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
              {searchText && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchText("")}
                  className="absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
                  data-testid="button-clear-search"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Basic Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Equipment</Label>
                <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
                  <SelectTrigger data-testid="select-equipment">
                    <SelectValue placeholder="Select equipment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Equipment</SelectItem>
                    {equipmentIds.map(id => (
                      <SelectItem key={id} value={id}>{id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Sensor Type</Label>
                <Select value={selectedSensorType} onValueChange={setSelectedSensorType}>
                  <SelectTrigger data-testid="select-sensor-type">
                    <SelectValue placeholder="Select sensor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sensors</SelectItem>
                    {sensorTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Time Range</Label>
                <Select value={useCustomDateRange ? "custom" : timeRange.toString()} onValueChange={(value) => {
                  if (value === "custom") {
                    setUseCustomDateRange(true);
                  } else {
                    setUseCustomDateRange(false);
                    setTimeRange(Number(value));
                  }
                }}>
                  <SelectTrigger data-testid="select-time-range">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Last Hour</SelectItem>
                    <SelectItem value="6">Last 6 Hours</SelectItem>
                    <SelectItem value="24">Last 24 Hours</SelectItem>
                    <SelectItem value="168">Last Week</SelectItem>
                    <SelectItem value="720">Last Month</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Chart Type</Label>
                <Select value={chartType} onValueChange={(value: "line" | "area" | "bar") => setChartType(value)}>
                  <SelectTrigger data-testid="select-chart-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="line">Line Chart</SelectItem>
                    <SelectItem value="area">Area Chart</SelectItem>
                    <SelectItem value="bar">Bar Chart</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Advanced Filters Panel */}
            {showAdvancedFilters && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Multi-select Equipment */}
                  <div>
                    <Label className="text-sm font-medium">Multiple Equipment</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between" data-testid="button-multi-equipment">
                          {selectedEquipmentIds.length === 0 
                            ? "Select equipment..." 
                            : `${selectedEquipmentIds.length} selected`}
                          <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="space-y-2">
                          {equipmentIds.map((id) => (
                            <div key={id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`equipment-${id}`}
                                checked={selectedEquipmentIds.includes(id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedEquipmentIds([...selectedEquipmentIds, id]);
                                  } else {
                                    setSelectedEquipmentIds(selectedEquipmentIds.filter(e => e !== id));
                                  }
                                }}
                                data-testid={`checkbox-equipment-${id}`}
                              />
                              <Label htmlFor={`equipment-${id}`} className="text-sm">{id}</Label>
                            </div>
                          ))}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setSelectedEquipmentIds([])}
                            className="w-full mt-2"
                            data-testid="button-clear-equipment"
                          >
                            Clear All
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Status Filters */}
                  <div>
                    <Label className="text-sm font-medium">Status Filter</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between" data-testid="button-status-filter">
                          {selectedStatusFilters.length === 0 
                            ? "All statuses" 
                            : `${selectedStatusFilters.length} selected`}
                          <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-60">
                        <div className="space-y-2">
                          {["normal", "warning", "critical"].map((status) => (
                            <div key={status} className="flex items-center space-x-2">
                              <Checkbox
                                id={`status-${status}`}
                                checked={selectedStatusFilters.includes(status)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedStatusFilters([...selectedStatusFilters, status]);
                                  } else {
                                    setSelectedStatusFilters(selectedStatusFilters.filter(s => s !== status));
                                  }
                                }}
                                data-testid={`checkbox-status-${status}`}
                              />
                              <Label htmlFor={`status-${status}`} className="text-sm capitalize">
                                <Badge variant={status === "normal" ? "default" : status === "warning" ? "secondary" : "destructive"}>
                                  {status}
                                </Badge>
                              </Label>
                            </div>
                          ))}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setSelectedStatusFilters([])}
                            className="w-full mt-2"
                            data-testid="button-clear-status"
                          >
                            Clear All
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Aggregation Type */}
                  <div>
                    <Label className="text-sm font-medium">Data Aggregation</Label>
                    <Select value={aggregationType} onValueChange={(value) => setAggregationType(value as typeof aggregationType)}>
                      <SelectTrigger data-testid="select-aggregation">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="current">Current Values</SelectItem>
                        <SelectItem value="average">Average</SelectItem>
                        <SelectItem value="min">Minimum</SelectItem>
                        <SelectItem value="max">Maximum</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Custom Date Range */}
                {useCustomDateRange && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Start Date</Label>
                      <Input
                        type="datetime-local"
                        value={customDateRange.start ? customDateRange.start.toISOString().slice(0, 16) : ""}
                        onChange={(e) => setCustomDateRange({
                          ...customDateRange,
                          start: e.target.value ? new Date(e.target.value) : null
                        })}
                        data-testid="input-start-date"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">End Date</Label>
                      <Input
                        type="datetime-local"
                        value={customDateRange.end ? customDateRange.end.toISOString().slice(0, 16) : ""}
                        onChange={(e) => setCustomDateRange({
                          ...customDateRange,
                          end: e.target.value ? new Date(e.target.value) : null
                        })}
                        data-testid="input-end-date"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(searchText || selectedEquipmentIds.length > 0 || selectedStatusFilters.length > 0) && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSearchText("");
                      setSelectedEquipmentIds([]);
                      setSelectedStatusFilters([]);
                      setSelectedSensorTypes([]);
                      setAggregationType("current");
                      setUseCustomDateRange(false);
                      setCustomDateRange({ start: null, end: null });
                      setTimeRange(24);
                    }}
                    data-testid="button-clear-filters"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Clear Filters
                  </Button>
                )}
                <Badge variant="secondary" className="text-xs">
                  {filteredTrendsArray?.length || trendsArray?.length || 0} sensors showing
                </Badge>
              </div>
              
              <Button 
                variant="default" 
                onClick={refreshData}
                data-testid="button-apply-filters"
              >
                <Activity className="mr-2 h-4 w-4" />
                Apply Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Time Series Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5" />
              Historical Trends
              {selectedEquipment !== "all" && selectedSensorType !== "all" && (
                <Badge variant="secondary" className="ml-2">
                  {selectedEquipment} - {selectedSensorType}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderChart()}
          </CardContent>
        </Card>

        {/* Current Telemetry Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart className="mr-2 h-5 w-5" />
              Live Sensor Readings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredTrendsArray.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {trendsArray.length === 0 
                  ? "No telemetry data available. Check if devices are sending sensor readings."
                  : "No sensors match the current filters. Try adjusting your search criteria."
                }
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredTrendsArray.map((trend, index) => (
                  <Card key={index} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-foreground">{trend.equipmentId}</h4>
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(trend.status)}`}></div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase">{trend.sensorType}</p>
                        <p className="text-lg font-bold text-foreground">
                          {trend.value} {trend.unit}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(trend.lastReading), { addSuffix: true })}
                        </p>
                        <Badge variant={trend.status === "normal" ? "default" : trend.status === "warning" ? "secondary" : "destructive"}>
                          {trend.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          {/* Maintenance Analytics Tab */}
          <TabsContent value="maintenance" className="space-y-6 mt-6">
            {/* Maintenance Cost Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="mr-2 h-5 w-5" />
                    Cost Trends (12 Months)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {costTrendsLoading ? (
                    <div className="flex items-center justify-center h-64 text-muted-foreground">Loading cost trends...</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={costTrendsData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`$${value}`, 'Cost']} />
                        <Legend />
                        <Area type="monotone" dataKey="labor" stackId="1" stroke="#3b82f6" fill="#3b82f6" />
                        <Area type="monotone" dataKey="parts" stackId="1" stroke="#10b981" fill="#10b981" />
                        <Area type="monotone" dataKey="equipment" stackId="1" stroke="#f59e0b" fill="#f59e0b" />
                        <Area type="monotone" dataKey="downtime" stackId="1" stroke="#ef4444" fill="#ef4444" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <PieChart className="mr-2 h-5 w-5" />
                    Cost Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {costSummaryLoading ? (
                    <div className="flex items-center justify-center h-64 text-muted-foreground">Loading cost breakdown...</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsPieChart 
                        data={costBreakdownData}
                      >
                        <Tooltip formatter={(value) => [`$${value}`, 'Total']} />
                        <Legend />
                        <RechartsPieChart
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          dataKey="value"
                        >
                          {costBreakdownData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </RechartsPieChart>
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Equipment Replacement Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="mr-2 h-5 w-5" />
                  Equipment Replacement Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                {replacementLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading recommendations...</div>
                ) : replacementRecommendations?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No equipment requires immediate replacement
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {replacementRecommendations?.map((rec, index) => (
                      <Card key={index} className="border">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-foreground">{rec.equipmentId}</h4>
                            <Badge 
                              variant={rec.condition === 'critical' ? 'destructive' : rec.condition === 'poor' ? 'secondary' : 'default'}
                            >
                              {rec.condition}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Operating Hours: {rec.operatingHours}</p>
                            <p className="text-xs text-muted-foreground">Maintenance Count: {rec.maintenanceCount}</p>
                            {rec.nextRecommendedReplacement && (
                              <p className="text-xs text-muted-foreground">
                                Next Replacement: {format(new Date(rec.nextRecommendedReplacement), 'MMM dd, yyyy')}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Maintenance Records */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="mr-2 h-5 w-5" />
                  Recent Maintenance Records
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recordsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading maintenance records...</div>
                ) : maintenanceRecords?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No maintenance records available
                  </div>
                ) : (
                  <div className="space-y-4">
                    {maintenanceRecords?.slice(0, 5).map((record, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{record.equipmentId}</h4>
                            <Badge variant="outline">{record.maintenanceType}</Badge>
                            <Badge 
                              variant={record.completionStatus === 'completed' ? 'default' : 
                                     record.completionStatus === 'in_progress' ? 'secondary' : 'destructive'}
                            >
                              {record.completionStatus}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {record.description || 'No description available'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {record.actualDuration ? `${record.actualDuration}h` : 'N/A'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {record.createdAt ? formatDistanceToNow(new Date(record.createdAt), { addSuffix: true }) : 'N/A'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fleet Performance Tab */}
          <TabsContent value="performance" className="space-y-6 mt-6">
            {/* Fleet Performance Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="mr-2 h-5 w-5" />
                  Fleet Performance Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {fleetPerformanceLoading ? (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">Loading fleet performance...</div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <RechartsBarChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="equipmentId" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="performance" fill="#3b82f6" name="Performance Score" />
                      <Bar dataKey="reliability" fill="#10b981" name="Reliability %" />
                      <Bar dataKey="availability" fill="#f59e0b" name="Availability %" />
                      <Bar dataKey="efficiency" fill="#8b5cf6" name="Efficiency %" />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Performance Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {fleetPerformance?.map((perf, index) => (
                <Card key={index} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-foreground">{perf.equipmentId}</h4>
                      <Settings className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Performance</span>
                        <span className="text-xs font-medium">{Math.round(perf.averageScore)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Reliability</span>
                        <span className="text-xs font-medium">{Math.round(perf.reliability * 100)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Availability</span>
                        <span className="text-xs font-medium">{Math.round(perf.availability * 100)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Efficiency</span>
                        <span className="text-xs font-medium">{Math.round(perf.efficiency * 100)}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Predictive Analytics Tab */}
          <TabsContent value="predictive" className="space-y-6 mt-6">
            {/* Health Score Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm">Average Health Score</p>
                      <p className="text-2xl font-bold text-foreground mt-1" data-testid="metric-avg-health">
                        {equipmentHealth?.length ? Math.round(equipmentHealth.reduce((sum: number, eq: any) => sum + eq.healthIndex, 0) / equipmentHealth.length) : 0}%
                      </p>
                    </div>
                    <div className="bg-green-100 p-3 rounded-lg">
                      <TrendingUp className="text-green-600" size={20} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm">Healthy Equipment</p>
                      <p className="text-2xl font-bold text-green-600 mt-1" data-testid="metric-healthy-count">
                        {equipmentHealth?.filter((eq: any) => eq.status === 'healthy').length || 0}
                      </p>
                    </div>
                    <div className="bg-green-100 p-3 rounded-lg">
                      <Activity className="text-green-600" size={20} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm">Warning Status</p>
                      <p className="text-2xl font-bold text-yellow-600 mt-1" data-testid="metric-warning-count">
                        {equipmentHealth?.filter((eq: any) => eq.status === 'warning').length || 0}
                      </p>
                    </div>
                    <div className="bg-yellow-100 p-3 rounded-lg">
                      <AlertTriangle className="text-yellow-600" size={20} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm">Critical Status</p>
                      <p className="text-2xl font-bold text-red-600 mt-1" data-testid="metric-critical-count">
                        {equipmentHealth?.filter((eq: any) => eq.status === 'critical').length || 0}
                      </p>
                    </div>
                    <div className="bg-red-100 p-3 rounded-lg">
                      <AlertTriangle className="text-red-600" size={20} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Health Score Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="mr-2 h-5 w-5" />
                    Health Score Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {equipmentHealthLoading ? (
                    <div className="flex items-center justify-center h-64 text-muted-foreground">Loading health distribution...</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsBarChart 
                        data={equipmentHealth?.map((eq: any) => ({
                          equipmentId: eq.id,
                          healthIndex: eq.healthIndex,
                          status: eq.status
                        })) || []}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="equipmentId" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip 
                          formatter={(value) => [`${value}%`, 'Health Score']}
                          labelFormatter={(label) => `Equipment: ${label}`}
                        />
                        <Bar 
                          dataKey="healthIndex" 
                          name="Health Score"
                          fill={(entry: any) => 
                            entry?.status === 'critical' ? '#ef4444' :
                            entry?.status === 'warning' ? '#f59e0b' : '#10b981'
                          }
                        />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="mr-2 h-5 w-5" />
                    Predicted Maintenance Due
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {equipmentHealthLoading ? (
                    <div className="flex items-center justify-center h-64 text-muted-foreground">Loading maintenance predictions...</div>
                  ) : (
                    <div className="space-y-4">
                      {equipmentHealth?.map((eq: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${
                              eq.status === 'critical' ? 'bg-red-500' :
                              eq.status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                            }`} />
                            <div>
                              <p className="font-medium text-foreground">{eq.id}</p>
                              <p className="text-sm text-muted-foreground">Health: {eq.healthIndex}%</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-foreground">
                              {eq.predictedDueDays > 0 ? `${eq.predictedDueDays} days` : 'Overdue'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {eq.status === 'critical' ? 'Immediate' : eq.status === 'warning' ? 'Soon' : 'Scheduled'}
                            </p>
                          </div>
                        </div>
                      )) || []}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* PdM Score History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart className="mr-2 h-5 w-5" />
                  PdM Score History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pdmScoresLoading ? (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">Loading PdM score history...</div>
                ) : pdmScores?.length ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart 
                      data={pdmScores?.map((score: any) => ({
                        date: format(new Date(score.ts), "MM/dd HH:mm"),
                        equipmentId: score.equipmentId,
                        healthIndex: score.healthIdx || 0,
                        failureProbability: (score.pFail30d || 0) * 100,
                        timestamp: score.ts
                      })).sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) || []}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip 
                        formatter={(value, name) => [
                          name === 'healthIndex' ? `${value}%` : `${Number(value).toFixed(1)}%`,
                          name === 'healthIndex' ? 'Health Score' : 'Failure Risk'
                        ]}
                        labelFormatter={(label) => `Time: ${label}`}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="healthIndex" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        name="Health Score"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="failureProbability" 
                        stroke="#ef4444" 
                        strokeWidth={2}
                        name="Failure Risk"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    No PdM score history available
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}