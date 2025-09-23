import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { RefreshCw, TrendingUp, Calendar, Filter, Activity, BarChart, Wifi, WifiOff, Radio, DollarSign, AlertTriangle, Wrench, Target, PieChart, Clock, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart as RechartsBarChart, Bar, AreaChart, Area, PieChart as RechartsPieChart, Cell } from "recharts";
import { fetchTelemetryTrends, fetchTelemetryHistory, fetchDevices } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/useWebSocket";
import { formatDistanceToNow, format } from "date-fns";

export default function Analytics() {
  const [selectedEquipment, setSelectedEquipment] = useState<string>("all");
  const [selectedSensorType, setSelectedSensorType] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<number>(24);
  const [chartType, setChartType] = useState<"line" | "area" | "bar">("line");
  const [liveTelemetryCount, setLiveTelemetryCount] = useState(0);

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

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ["/api/telemetry/history", selectedEquipment, selectedSensorType, timeRange],
    queryFn: () => 
      selectedEquipment !== "all" && selectedSensorType !== "all"
        ? fetchTelemetryHistory(selectedEquipment, selectedSensorType, timeRange)
        : Promise.resolve([]),
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
          ["/api/telemetry/history", selectedEquipment, selectedSensorType, timeRange],
          (oldData: any[]) => {
            if (!oldData) return [newDataPoint];
            const updatedData = [...oldData, newDataPoint];
            // Keep only data within time range and limit to reasonable chart size
            const timeThreshold = new Date(Date.now() - timeRange * 60 * 60 * 1000);
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

  // Process history data for time-series chart
  const processedHistory = historyData?.map(reading => ({
    time: format(new Date(reading.ts!), "HH:mm"),
    fullTime: reading.ts,
    value: reading.value,
    threshold: reading.threshold,
    status: reading.status,
    unit: reading.unit,
  })) || [];

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

    const ChartComponent = chartType === "line" ? LineChart : chartType === "area" ? AreaChart : RechartsBarChart;

    return (
      <ResponsiveContainer width="100%" height={400}>
        <ChartComponent data={processedHistory}>
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

  const costTrendsData = costTrends?.map(trend => ({
    month: trend.month,
    totalCost: trend.totalCost,
    labor: trend.costByType.labor || 0,
    parts: trend.costByType.parts || 0,
    equipment: trend.costByType.equipment || 0,
    downtime: trend.costByType.downtime || 0,
  })) || [];

  const costBreakdownData = costSummary?.reduce((acc, summary) => {
    Object.entries(summary.costByType).forEach(([type, amount]) => {
      const existing = acc.find(item => item.name === type);
      if (existing) {
        existing.value += amount;
      } else {
        acc.push({ name: type, value: amount });
      }
    });
    return acc;
  }, [] as { name: string; value: number }[]) || [];

  const performanceData = fleetPerformance?.map(perf => ({
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
          <TabsList className="grid w-full grid-cols-3">
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
          </TabsList>

          {/* Telemetry Analytics Tab */}
          <TabsContent value="telemetry" className="space-y-6 mt-6">
            {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="mr-2 h-5 w-5" />
              Analytics Controls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Equipment</label>
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
                <label className="text-sm font-medium text-muted-foreground">Sensor Type</label>
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
                <label className="text-sm font-medium text-muted-foreground">Time Range</label>
                <Select value={timeRange.toString()} onValueChange={(value) => setTimeRange(Number(value))}>
                  <SelectTrigger data-testid="select-time-range">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Last Hour</SelectItem>
                    <SelectItem value="6">Last 6 Hours</SelectItem>
                    <SelectItem value="24">Last 24 Hours</SelectItem>
                    <SelectItem value="168">Last Week</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Chart Type</label>
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
              
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={refreshData}
                  className="w-full"
                  data-testid="button-apply-filters"
                >
                  <Activity className="mr-2 h-4 w-4" />
                  Apply Filters
                </Button>
              </div>
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
            {trendsArray.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No telemetry data available. Check if devices are sending sensor readings.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {trendsArray.map((trend, index) => (
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
                      <RechartsPieChart>
                        <Tooltip formatter={(value) => [`$${value}`, 'Total']} />
                        <Legend />
                        <RechartsPieChart 
                          data={costBreakdownData}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {costBreakdownData.map((entry, index) => (
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
        </Tabs>
      </div>
    </div>
  );
}