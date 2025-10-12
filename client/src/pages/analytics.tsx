import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { RefreshCw, TrendingUp, Calendar, Filter, Activity, BarChart, Wifi, WifiOff, Radio, DollarSign, AlertTriangle, Wrench, Target, PieChart, Clock, Settings, Search, X, ChevronDown, Brain, Lightbulb, Zap, Shield } from "lucide-react";
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
import { formatTimeSgt } from "@/lib/time-utils";
import { useToast } from "@/hooks/use-toast";

export default function Analytics() {
  const { toast } = useToast();
  
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

  // AI insights state
  const [selectedEquipmentForAI, setSelectedEquipmentForAI] = useState<string>("");
  const [aiInsightsLoading, setAiInsightsLoading] = useState(false);

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

  // AI insights queries
  const { data: fleetAIAnalysis, isLoading: fleetAILoading, refetch: refetchFleetAI } = useQuery({
    queryKey: ["/api/llm/fleet/analyze"],
    queryFn: async () => {
      const response = await fetch("/api/llm/fleet/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours: timeRange })
      });
      if (!response.ok) throw new Error("Failed to fetch fleet AI analysis");
      return response.json();
    },
    refetchInterval: 300000, // 5 minutes - less frequent due to cost
    staleTime: 240000, // 4 minutes
  });

  const { data: equipmentAIInsights, isLoading: equipmentAILoading, refetch: refetchEquipmentAI } = useQuery({
    queryKey: ["/api/llm/equipment/insights", selectedEquipmentForAI],
    queryFn: async () => {
      if (!selectedEquipmentForAI) return null;
      const response = await fetch(`/api/llm/equipment/${selectedEquipmentForAI}/insights?includeRecommendations=true&hours=${timeRange}`);
      if (!response.ok) throw new Error("Failed to fetch equipment AI insights");
      return response.json();
    },
    enabled: !!selectedEquipmentForAI,
    refetchInterval: 300000, // 5 minutes
    staleTime: 240000,
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

  // Fetch equipment data for name lookups
  const { data: equipment = [] } = useQuery({
    queryKey: ["/api/equipment"],
    queryFn: async () => {
      const response = await fetch("/api/equipment");
      if (!response.ok) throw new Error("Failed to fetch equipment");
      return response.json();
    },
    refetchInterval: 60000,
  });

  // Helper function to get equipment name from ID
  const getEquipmentName = (equipmentId: string | null | undefined): string => {
    if (!equipmentId) return "Unknown";
    
    // First check equipment health data (has name field)
    const healthItem = equipmentHealth?.find((eq: any) => eq.id === equipmentId);
    if (healthItem?.name) return healthItem.name;
    
    // Then check equipment data
    const equipmentItem = equipment?.find((eq: any) => eq.id === equipmentId);
    if (equipmentItem?.name) return equipmentItem.name;
    
    // Fallback to ID
    return equipmentId;
  };

  // Advanced Analytics Queries
  const { data: anomalies, isLoading: anomaliesLoading } = useQuery({
    queryKey: ["/api/analytics/anomalies", selectedEquipment, timeRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        hours: timeRange.toString(),
        threshold: '2.0'
      });
      if (selectedEquipment !== 'all') params.append('equipmentId', selectedEquipment);
      
      const response = await fetch(`/api/analytics/anomalies?${params}`);
      if (!response.ok) throw new Error("Failed to fetch anomalies");
      return response.json();
    },
    refetchInterval: 60000,
  });

  const { data: healthTrends, isLoading: healthTrendsLoading } = useQuery({
    queryKey: ["/api/analytics/health-trends", selectedEquipment],
    queryFn: async () => {
      const params = new URLSearchParams({ months: '12' });
      if (selectedEquipment !== 'all') params.append('equipmentId', selectedEquipment);
      
      const response = await fetch(`/api/analytics/health-trends?${params}`);
      if (!response.ok) throw new Error("Failed to fetch health trends");
      return response.json();
    },
    refetchInterval: 120000,
  });

  const { data: operationalEfficiency, isLoading: efficiencyLoading } = useQuery({
    queryKey: ["/api/analytics/operational-efficiency", selectedEquipment, timeRange],
    queryFn: async () => {
      const params = new URLSearchParams({ hours: timeRange.toString() });
      if (selectedEquipment !== 'all') params.append('equipmentId', selectedEquipment);
      
      const response = await fetch(`/api/analytics/operational-efficiency?${params}`);
      if (!response.ok) throw new Error("Failed to fetch operational efficiency");
      return response.json();
    },
    refetchInterval: 60000,
  });

  const { data: failurePatterns, isLoading: failurePatternsLoading } = useQuery({
    queryKey: ["/api/analytics/failure-patterns", selectedEquipment],
    queryFn: async () => {
      const params = new URLSearchParams({ months: '12' });
      if (selectedEquipment !== 'all') params.append('equipmentId', selectedEquipment);
      
      const response = await fetch(`/api/analytics/failure-patterns?${params}`);
      if (!response.ok) throw new Error("Failed to fetch failure patterns");
      return response.json();
    },
    refetchInterval: 180000,
  });

  // Cost Intelligence Queries
  const { data: roiAnalysis, isLoading: roiLoading } = useQuery({
    queryKey: ["/api/analytics/roi-analysis", selectedEquipment],
    queryFn: async () => {
      const params = new URLSearchParams({ months: '12' });
      if (selectedEquipment !== 'all') params.append('equipmentId', selectedEquipment);
      
      const response = await fetch(`/api/analytics/roi-analysis?${params}`);
      if (!response.ok) throw new Error("Failed to fetch ROI analysis");
      return response.json();
    },
    refetchInterval: 300000,
  });

  const { data: costOptimization, isLoading: costOptimizationLoading } = useQuery({
    queryKey: ["/api/analytics/cost-optimization", selectedEquipment],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedEquipment !== 'all') params.append('equipmentId', selectedEquipment);
      
      const response = await fetch(`/api/analytics/cost-optimization?${params}`);
      if (!response.ok) throw new Error("Failed to fetch cost optimization");
      return response.json();
    },
    refetchInterval: 300000,
  });

  const { data: advancedCostTrends, isLoading: advancedCostTrendsLoading } = useQuery({
    queryKey: ["/api/analytics/advanced-cost-trends", selectedEquipment],
    queryFn: async () => {
      const params = new URLSearchParams({ months: '24' });
      if (selectedEquipment !== 'all') params.append('equipmentId', selectedEquipment);
      
      const response = await fetch(`/api/analytics/advanced-cost-trends?${params}`);
      if (!response.ok) throw new Error("Failed to fetch advanced cost trends");
      return response.json();
    },
    refetchInterval: 300000,
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
    toast({
      title: "Refreshing analytics...",
      description: "Updating telemetry data and trends",
    });
    
    queryClient.invalidateQueries({ queryKey: ["/api/telemetry/trends"] });
    if (selectedEquipment !== "all" && selectedSensorType !== "all") {
      queryClient.invalidateQueries({ queryKey: ["/api/telemetry/history"] });
    }
    
    setTimeout(() => {
      toast({
        title: "Analytics refreshed",
        description: "All data updated successfully",
      });
    }, 500);
  };

  // Process data for charts
  const processedTrends = telemetryTrends?.reduce((acc, reading) => {
    const key = `${reading.equipmentId}-${reading.sensorType}`;
    if (!acc[key]) {
      // Get the most recent timestamp from the data array
      const mostRecentData = reading.data?.[0]; // data is already sorted by newest first
      acc[key] = {
        name: `${getEquipmentName(reading.equipmentId)} ${reading.sensorType}`,
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
        if (!item.fullTime) return false;
        const itemTime = new Date(item.fullTime);
        return itemTime >= customDateRange.start! && itemTime <= customDateRange.end!;
      })
    : processedHistory;

  // Get unique equipment IDs from multiple sources
  const telemetryEquipmentIds = Array.from(new Set(telemetryTrends?.map(t => t.equipmentId) || []));
  const healthEquipmentIds = Array.from(new Set(equipmentHealth?.map(h => h.id) || []));
  const equipmentIds = Array.from(new Set([...telemetryEquipmentIds, ...healthEquipmentIds]));
  const sensorTypes = Array.from(new Set(telemetryTrends?.map(t => t.sensorType) || []));

  const getStatusColor = (status: string) => {
    switch (status) {
      case "normal": return "bg-green-500";
      case "warning": return "bg-yellow-500";
      case "critical": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const currentTime = `${formatTimeSgt(new Date())} SGT`;

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
      <header className="bg-card border-b border-border px-4 sm:px-6 py-4">
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
          <div className="flex-1">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">Analytics Dashboard</h2>
            <p className="text-sm sm:text-base text-muted-foreground">Comprehensive telemetry and maintenance analytics</p>
          </div>
          <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
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
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Button 
                onClick={refreshData}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                size="sm"
                data-testid="button-refresh"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Refresh Data</span>
                <span className="sm:hidden">Refresh</span>
              </Button>
              <div className="flex items-center text-xs sm:text-sm text-muted-foreground">
                <span data-testid="text-current-time">{currentTime}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 sm:px-6 space-y-6">
        {/* Analytics Tabs */}
        <Tabs defaultValue="telemetry" className="w-full">
          <div className="overflow-x-auto">
            <TabsList className="inline-flex w-full min-w-fit p-1 gap-1">
              <TabsTrigger 
                value="telemetry" 
                data-testid="tab-telemetry" 
                className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px] min-w-[60px] sm:min-w-[80px] transition-all"
              >
                <Activity className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Telemetry</span>
                <span className="sm:hidden">Tel</span>
              </TabsTrigger>
              <TabsTrigger 
                value="maintenance" 
                data-testid="tab-maintenance" 
                className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px] min-w-[60px] sm:min-w-[80px] transition-all"
              >
                <Wrench className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Maintenance</span>
                <span className="sm:hidden">Maint</span>
              </TabsTrigger>
              <TabsTrigger 
                value="performance" 
                data-testid="tab-performance" 
                className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px] min-w-[60px] sm:min-w-[80px] transition-all"
              >
                <Target className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Performance</span>
                <span className="sm:hidden">Perf</span>
              </TabsTrigger>
              <TabsTrigger 
                value="predictive" 
                data-testid="tab-predictive" 
                className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px] min-w-[60px] sm:min-w-[80px] transition-all"
              >
                <TrendingUp className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Predictive</span>
                <span className="sm:hidden">Pred</span>
              </TabsTrigger>
              <TabsTrigger 
                value="advanced" 
                data-testid="tab-advanced" 
                className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px] min-w-[60px] sm:min-w-[80px] transition-all"
              >
                <Brain className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Advanced</span>
                <span className="sm:hidden">Adv</span>
              </TabsTrigger>
              <TabsTrigger 
                value="intelligence" 
                data-testid="tab-intelligence" 
                className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px] min-w-[60px] sm:min-w-[80px] transition-all"
              >
                <DollarSign className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Intelligence</span>
                <span className="sm:hidden">Intel</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Telemetry Analytics Tab */}
          <TabsContent value="telemetry" className="space-y-6 mt-6">
            {/* Enhanced Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="overflow-x-auto">
              <div className="flex items-center justify-between whitespace-nowrap min-w-0 pb-1 space-x-4">
                <div className="flex items-center flex-shrink-0">
                  <Filter className="mr-2 h-5 w-5 flex-shrink-0" />
                  <span className="flex-shrink-0">Analytics Controls</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    console.log('Toggle advanced filters - current state:', showAdvancedFilters);
                    const newState = !showAdvancedFilters;
                    console.log('Setting advanced filters to:', newState);
                    setShowAdvancedFilters(newState);
                  }}
                  data-testid="button-toggle-advanced"
                  className="flex-shrink-0"
                  aria-expanded={showAdvancedFilters}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  {showAdvancedFilters ? "Hide" : "Show"} Advanced
                </Button>
              </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Equipment</Label>
                <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
                  <SelectTrigger data-testid="select-equipment">
                    <SelectValue placeholder="Select equipment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Equipment</SelectItem>
                    {equipmentIds.map(id => (
                      <SelectItem key={id} value={id}>{getEquipmentName(id)}</SelectItem>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:gap-2">
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
                    className="w-full sm:w-auto"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Clear Filters
                  </Button>
                )}
                <Badge variant="secondary" className="text-xs w-fit">
                  {filteredTrendsArray?.length || trendsArray?.length || 0} sensors showing
                </Badge>
              </div>
              
              <Button 
                variant="default" 
                onClick={refreshData}
                data-testid="button-apply-filters"
                className="w-full sm:w-auto"
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
            <CardTitle className="overflow-x-auto">
              <div className="flex items-center whitespace-nowrap min-w-0 pb-1">
                <TrendingUp className="mr-2 h-5 w-5 flex-shrink-0" />
                <span className="flex-shrink-0">Historical Trends</span>
                {selectedEquipment !== "all" && selectedSensorType !== "all" && (
                  <Badge variant="secondary" className="ml-2 flex-shrink-0">
                    {selectedEquipment} - {selectedSensorType}
                  </Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderChart()}
          </CardContent>
        </Card>

        {/* Current Telemetry Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="overflow-x-auto">
              <div className="flex items-center whitespace-nowrap min-w-0 pb-1">
                <BarChart className="mr-2 h-5 w-5 flex-shrink-0" />
                <span className="flex-shrink-0">Live Sensor Readings</span>
              </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                  <CardTitle className="overflow-x-auto">
                    <div className="flex items-center whitespace-nowrap min-w-0 pb-1">
                      <DollarSign className="mr-2 h-5 w-5 flex-shrink-0" />
                      <span className="flex-shrink-0">Cost Trends (12 Months)</span>
                    </div>
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
                  <CardTitle className="overflow-x-auto">
                    <div className="flex items-center whitespace-nowrap min-w-0 pb-1">
                      <PieChart className="mr-2 h-5 w-5 flex-shrink-0" />
                      <span className="flex-shrink-0">Cost Breakdown</span>
                    </div>
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
                <CardTitle className="overflow-x-auto">
                  <div className="flex items-center whitespace-nowrap min-w-0 pb-1">
                    <AlertTriangle className="mr-2 h-5 w-5 flex-shrink-0" />
                    <span className="flex-shrink-0">Equipment Replacement Recommendations</span>
                  </div>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {replacementRecommendations?.map((rec: any, index: number) => (
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
                <CardTitle className="overflow-x-auto">
                  <div className="flex items-center whitespace-nowrap min-w-0 pb-1">
                    <Clock className="mr-2 h-5 w-5 flex-shrink-0" />
                    <span className="flex-shrink-0">Recent Maintenance Records</span>
                  </div>
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
                    {maintenanceRecords?.slice(0, 5).map((record: any, index: number) => (
                      <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg gap-4">
                        <div className="flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <h4 className="font-medium">{record.equipmentId}</h4>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline">{record.maintenanceType}</Badge>
                              <Badge 
                                variant={record.completionStatus === 'completed' ? 'default' : 
                                       record.completionStatus === 'in_progress' ? 'secondary' : 'destructive'}
                              >
                                {record.completionStatus}
                              </Badge>
                            </div>
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
                <CardTitle className="overflow-x-auto">
                  <div className="flex items-center whitespace-nowrap min-w-0 pb-1">
                    <Target className="mr-2 h-5 w-5 flex-shrink-0" />
                    <span className="flex-shrink-0">Fleet Performance Overview</span>
                  </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {fleetPerformance?.map((perf: any, index: number) => (
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                  <CardTitle className="overflow-x-auto">
                    <div className="flex items-center whitespace-nowrap min-w-0 pb-1">
                      <TrendingUp className="mr-2 h-5 w-5 flex-shrink-0" />
                      <span className="flex-shrink-0">Health Score Distribution</span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {equipmentHealthLoading ? (
                    <div className="flex items-center justify-center h-64 text-muted-foreground">Loading health distribution...</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsBarChart 
                        data={equipmentHealth?.map((eq: any) => ({
                          equipmentName: eq.name || eq.id,
                          healthIndex: eq.healthIndex,
                          status: eq.status
                        })) || []}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="equipmentName" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip 
                          formatter={(value) => [`${value}%`, 'Health Score']}
                          labelFormatter={(label) => `Equipment: ${label}`}
                        />
                        <Bar 
                          dataKey="healthIndex" 
                          name="Health Score"
                          fill="#10b981"
                        />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="overflow-x-auto">
                    <div className="flex items-center whitespace-nowrap min-w-0 pb-1">
                      <Clock className="mr-2 h-5 w-5 flex-shrink-0" />
                      <span className="flex-shrink-0">Predicted Maintenance Due</span>
                    </div>
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
                              <p className="font-medium text-foreground">{eq.name || eq.id}</p>
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
                <CardTitle className="overflow-x-auto">
                  <div className="flex items-center whitespace-nowrap min-w-0 pb-1">
                    <BarChart className="mr-2 h-5 w-5 flex-shrink-0" />
                    <span className="flex-shrink-0">PdM Score History</span>
                  </div>
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

            {/* AI Insights Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center">
                  <Brain className="mr-2 h-5 w-5 text-blue-600" />
                  AI-Powered Maintenance Insights
                </h3>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => refetchFleetAI()}
                    disabled={fleetAILoading}
                    data-testid="button-refresh-fleet-ai"
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${fleetAILoading ? 'animate-spin' : ''}`} />
                    Refresh Fleet Analysis
                  </Button>
                </div>
              </div>

              {/* Fleet AI Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="overflow-x-auto">
                    <div className="flex items-center whitespace-nowrap min-w-0 pb-1">
                      <Zap className="mr-2 h-5 w-5 text-yellow-600 flex-shrink-0" />
                      <span className="flex-shrink-0">Fleet Intelligence Overview</span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {fleetAILoading ? (
                    <div className="flex items-center justify-center h-64 text-muted-foreground">
                      <Brain className="h-8 w-8 mr-2 animate-pulse" />
                      Analyzing fleet data with AI...
                    </div>
                  ) : fleetAIAnalysis ? (
                    <div className="space-y-6">
                      {/* Fleet Summary Metrics */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
                          <CardContent className="p-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-700 dark:text-green-400" data-testid="metric-ai-healthy">
                                {fleetAIAnalysis.healthyEquipment}
                              </div>
                              <div className="text-sm text-green-600 dark:text-green-500">Healthy Equipment</div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
                          <CardContent className="p-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400" data-testid="metric-ai-at-risk">
                                {fleetAIAnalysis.equipmentAtRisk}
                              </div>
                              <div className="text-sm text-yellow-600 dark:text-yellow-500">At Risk</div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
                          <CardContent className="p-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-red-700 dark:text-red-400" data-testid="metric-ai-critical">
                                {fleetAIAnalysis.criticalEquipment}
                              </div>
                              <div className="text-sm text-red-600 dark:text-red-500">Critical</div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
                          <CardContent className="p-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-blue-700 dark:text-blue-400" data-testid="metric-ai-cost">
                                ${fleetAIAnalysis.costEstimate?.toLocaleString() || 0}
                              </div>
                              <div className="text-sm text-blue-600 dark:text-blue-500">Est. Maintenance Cost</div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* AI Summary */}
                      <Card className="border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <h4 className="font-medium text-foreground mb-2 flex items-center">
                            <Lightbulb className="h-4 w-4 mr-2 text-blue-600" />
                            AI Fleet Analysis Summary
                          </h4>
                          <p className="text-muted-foreground text-sm leading-relaxed" data-testid="text-ai-summary">
                            {fleetAIAnalysis.summary}
                          </p>
                        </CardContent>
                      </Card>

                      {/* Top Recommendations */}
                      {fleetAIAnalysis.topRecommendations?.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm overflow-x-auto">
                              <div className="flex items-center whitespace-nowrap min-w-0 pb-1">
                                <Target className="mr-2 h-4 w-4 text-green-600 flex-shrink-0" />
                                <span className="flex-shrink-0">Top AI Recommendations</span>
                              </div>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {fleetAIAnalysis.topRecommendations.slice(0, 5).map((rec: string, index: number) => (
                                <div key={index} className="flex items-start space-x-2">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                  <span className="text-sm text-muted-foreground" data-testid={`text-ai-recommendation-${index}`}>
                                    {rec}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-muted-foreground">
                      <div className="text-center space-y-2">
                        <Brain className="h-12 w-12 mx-auto text-muted-foreground/50" />
                        <p>No AI fleet analysis available</p>
                        <p className="text-xs">Click refresh to generate AI insights</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Equipment-Specific AI Insights */}
              <Card>
                <CardHeader>
                  <CardTitle className="overflow-x-auto">
                    <div className="flex items-center whitespace-nowrap min-w-0 pb-1">
                      <Shield className="mr-2 h-5 w-5 text-purple-600 flex-shrink-0" />
                      <span className="flex-shrink-0">Equipment-Specific AI Analysis</span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Equipment Selector */}
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="ai-equipment-select" className="text-sm font-medium">
                        Select Equipment:
                      </Label>
                      <Select 
                        value={selectedEquipmentForAI} 
                        onValueChange={setSelectedEquipmentForAI}
                      >
                        <SelectTrigger className="w-64" id="ai-equipment-select" data-testid="select-equipment-ai">
                          <SelectValue placeholder="Choose equipment for AI analysis" />
                        </SelectTrigger>
                        <SelectContent>
                          {equipmentIds.map((equipmentId: string) => {
                            const device = devices?.find(d => d.id === equipmentId);
                            const healthData = equipmentHealth?.find(h => h.id === equipmentId);
                            const vessel = device?.vessel || healthData?.vessel || 'Unknown Vessel';
                            return (
                              <SelectItem key={equipmentId} value={equipmentId} data-testid={`option-equipment-${equipmentId}`}>
                                {getEquipmentName(equipmentId)} ({vessel})
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      {selectedEquipmentForAI && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => refetchEquipmentAI()}
                          disabled={equipmentAILoading}
                          data-testid="button-refresh-equipment-ai"
                        >
                          <RefreshCw className={`h-4 w-4 mr-1 ${equipmentAILoading ? 'animate-spin' : ''}`} />
                          Analyze
                        </Button>
                      )}
                    </div>

                    {/* Equipment AI Insights */}
                    {selectedEquipmentForAI && (
                      <div className="space-y-4">
                        {equipmentAILoading ? (
                          <div className="flex items-center justify-center h-32 text-muted-foreground">
                            <Brain className="h-6 w-6 mr-2 animate-pulse" />
                            Generating AI insights for {selectedEquipmentForAI}...
                          </div>
                        ) : equipmentAIInsights?.analysis ? (
                          <div className="space-y-4">
                            {/* Health Score */}
                            <Card className="border-l-4 border-l-green-500">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="font-medium text-foreground">Overall Equipment Health</h4>
                                    <p className="text-2xl font-bold text-green-600 mt-1" data-testid="text-ai-health-score">
                                      {equipmentAIInsights.analysis.overallHealth}%
                                    </p>
                                  </div>
                                  <Activity className="h-8 w-8 text-green-600" />
                                </div>
                                <p className="text-sm text-muted-foreground mt-2" data-testid="text-ai-analysis-summary">
                                  {equipmentAIInsights.analysis.summary}
                                </p>
                              </CardContent>
                            </Card>

                            {/* AI Insights */}
                            {equipmentAIInsights.analysis.insights?.length > 0 && (
                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-sm overflow-x-auto">
                                    <div className="flex items-center whitespace-nowrap min-w-0 pb-1">
                                      <span className="flex-shrink-0">AI Maintenance Insights</span>
                                    </div>
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-3">
                                    {equipmentAIInsights.analysis.insights.map((insight: any, index: number) => (
                                      <div key={index} className="border rounded-lg p-3">
                                        <div className="flex items-center justify-between mb-2">
                                          <h5 className="font-medium text-sm" data-testid={`text-insight-title-${index}`}>
                                            {insight.title}
                                          </h5>
                                          <div className="flex space-x-2">
                                            <Badge 
                                              variant={insight.severity === 'critical' ? 'destructive' : 
                                                      insight.severity === 'high' ? 'destructive' :
                                                      insight.severity === 'medium' ? 'default' : 'secondary'}
                                              data-testid={`badge-severity-${index}`}
                                            >
                                              {insight.severity}
                                            </Badge>
                                            <Badge 
                                              variant="outline"
                                              data-testid={`badge-urgency-${index}`}
                                            >
                                              {insight.urgency}
                                            </Badge>
                                          </div>
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-2" data-testid={`text-insight-description-${index}`}>
                                          {insight.description}
                                        </p>
                                        {insight.recommendations?.length > 0 && (
                                          <div>
                                            <h6 className="text-xs font-medium text-foreground mb-1">Recommendations:</h6>
                                            <ul className="text-xs text-muted-foreground space-y-1">
                                              {insight.recommendations.map((rec: string, recIndex: number) => (
                                                <li key={recIndex} className="flex items-start space-x-1" data-testid={`text-recommendation-${index}-${recIndex}`}>
                                                  <span>•</span>
                                                  <span>{rec}</span>
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                        {insight.estimatedCost > 0 && (
                                          <div className="mt-2 pt-2 border-t">
                                            <span className="text-xs text-muted-foreground">
                                              Est. Cost: <span className="font-medium" data-testid={`text-cost-${index}`}>${insight.estimatedCost.toLocaleString()}</span>
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </CardContent>
                              </Card>
                            )}

                            {/* Critical Alerts */}
                            {equipmentAIInsights.analysis.criticalAlerts?.length > 0 && (
                              <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
                                <CardHeader>
                                  <CardTitle className="text-sm text-red-700 dark:text-red-400 overflow-x-auto">
                                    <div className="flex items-center whitespace-nowrap min-w-0 pb-1">
                                      <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
                                      <span className="flex-shrink-0">Critical Alerts</span>
                                    </div>
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <ul className="space-y-1">
                                    {equipmentAIInsights.analysis.criticalAlerts.map((alert: string, index: number) => (
                                      <li key={index} className="text-sm text-red-700 dark:text-red-400" data-testid={`text-critical-alert-${index}`}>
                                        • {alert}
                                      </li>
                                    ))}
                                  </ul>
                                </CardContent>
                              </Card>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <Brain className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                            <p>No AI insights available for this equipment</p>
                            <p className="text-xs">Try refreshing or check if telemetry data is available</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Advanced Analytics Tab */}
          <TabsContent value="advanced" className="space-y-6 mt-6">
            {/* Advanced Analytics Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm">Anomalies Detected</p>
                      <p className="text-2xl font-bold text-orange-600 mt-1" data-testid="metric-anomalies">
                        {anomalies?.length || 0}
                      </p>
                    </div>
                    <div className="bg-orange-100 p-3 rounded-lg">
                      <AlertTriangle className="text-orange-600" size={20} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm">Avg Efficiency</p>
                      <p className="text-2xl font-bold text-blue-600 mt-1" data-testid="metric-efficiency">
                        {operationalEfficiency?.fleetSummary?.avgEfficiencyIndex ? 
                          Math.round(operationalEfficiency.fleetSummary.avgEfficiencyIndex) : 0}%
                      </p>
                    </div>
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <Target className="text-blue-600" size={20} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm">Fleet Uptime</p>
                      <p className="text-2xl font-bold text-green-600 mt-1" data-testid="metric-uptime">
                        {operationalEfficiency?.fleetSummary?.avgUptime ? 
                          Math.round(operationalEfficiency.fleetSummary.avgUptime) : 0}%
                      </p>
                    </div>
                    <div className="bg-green-100 p-3 rounded-lg">
                      <Clock className="text-green-600" size={20} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm">Risk Score</p>
                      <p className="text-2xl font-bold text-red-600 mt-1" data-testid="metric-risk-score">
                        {failurePatterns?.summary?.avgRiskScore ? 
                          Math.round(failurePatterns.summary.avgRiskScore) : 0}
                      </p>
                    </div>
                    <div className="bg-red-100 p-3 rounded-lg">
                      <Shield className="text-red-600" size={20} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Anomaly Detection & Operational Efficiency */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="overflow-x-auto">
                    <div className="flex items-center whitespace-nowrap min-w-0 pb-1">
                      <AlertTriangle className="mr-2 h-5 w-5 flex-shrink-0" />
                      <span className="flex-shrink-0">Anomaly Detection</span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {anomaliesLoading ? (
                    <div className="flex items-center justify-center h-64 text-muted-foreground">Loading anomalies...</div>
                  ) : anomalies?.length ? (
                    <div className="space-y-4">
                      {anomalies.slice(0, 5).map((anomaly: any, index: number) => (
                        <div key={index} className="border border-border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{getEquipmentName(anomaly.equipmentId)} - {anomaly.sensorType}</h4>
                            <Badge variant={anomaly.anomalies?.[0]?.severity === 'critical' ? 'destructive' : 'secondary'}>
                              {anomaly.anomalyCount} anomalies
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Anomaly Rate: {Math.round(anomaly.anomalyRate * 100) / 100}%
                          </p>
                          <div className="text-xs text-muted-foreground">
                            Latest: {anomaly.anomalies?.[0] ? new Date(anomaly.anomalies[0].timestamp).toLocaleString() : 'N/A'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-muted-foreground">
                      No anomalies detected in selected timeframe
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="overflow-x-auto">
                    <div className="flex items-center whitespace-nowrap min-w-0 pb-1">
                      <Target className="mr-2 h-5 w-5 flex-shrink-0" />
                      <span className="flex-shrink-0">Operational Efficiency</span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {efficiencyLoading ? (
                    <div className="flex items-center justify-center h-64 text-muted-foreground">Loading efficiency data...</div>
                  ) : operationalEfficiency?.equipmentEfficiency?.length ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsBarChart 
                        data={operationalEfficiency.equipmentEfficiency.map((eff: any) => ({
                          equipment: getEquipmentName(eff.equipmentId),
                          uptime: eff.uptime,
                          availability: eff.availability,
                          efficiency: eff.efficiencyIndex,
                          status: eff.status
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="equipment" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip 
                          formatter={(value, name) => [`${value}%`, name]}
                          labelFormatter={(label) => `Equipment: ${label}`}
                        />
                        <Legend />
                        <Bar dataKey="uptime" fill="#10b981" name="Uptime" />
                        <Bar dataKey="availability" fill="#3b82f6" name="Availability" />
                        <Bar dataKey="efficiency" fill="#8b5cf6" name="Efficiency Index" />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-muted-foreground">
                      No efficiency data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Health Trends & Failure Patterns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="overflow-x-auto">
                    <div className="flex items-center whitespace-nowrap min-w-0 pb-1">
                      <TrendingUp className="mr-2 h-5 w-5 flex-shrink-0" />
                      <span className="flex-shrink-0">Health Trends Analysis</span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {healthTrendsLoading ? (
                    <div className="flex items-center justify-center h-64 text-muted-foreground">Loading health trends...</div>
                  ) : healthTrends?.healthTrends?.length ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={healthTrends.healthTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip 
                          formatter={(value, name) => [`${value}%`, name]}
                          labelFormatter={(label) => `Month: ${label}`}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="avgHealthScore" 
                          stroke="#10b981" 
                          strokeWidth={2}
                          name="Avg Health Score"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="minHealthScore" 
                          stroke="#ef4444" 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          name="Min Health Score"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-muted-foreground">
                      No health trend data available
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="overflow-x-auto">
                    <div className="flex items-center whitespace-nowrap min-w-0 pb-1">
                      <Shield className="mr-2 h-5 w-5 flex-shrink-0" />
                      <span className="flex-shrink-0">Failure Pattern Analysis</span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {failurePatternsLoading ? (
                    <div className="flex items-center justify-center h-64 text-muted-foreground">Loading failure patterns...</div>
                  ) : failurePatterns?.riskPredictions?.length ? (
                    <div className="space-y-4">
                      {failurePatterns.riskPredictions.slice(0, 5).map((prediction: any, index: number) => (
                        <div key={index} className="border border-border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{getEquipmentName(prediction.equipmentId)}</h4>
                            <Badge variant={
                              prediction.riskLevel === 'critical' ? 'destructive' :
                              prediction.riskLevel === 'high' ? 'secondary' : 'outline'
                            }>
                              {prediction.riskLevel} risk
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Health Score:</span>
                              <span className="ml-2 font-medium">{prediction.currentHealthScore}%</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Failure Risk:</span>
                              <span className="ml-2 font-medium">{prediction.failureRisk}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-muted-foreground">
                      No failure pattern data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Cost Intelligence Tab */}
          <TabsContent value="intelligence" className="space-y-6 mt-6">
            {/* ROI Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm">Fleet ROI</p>
                      <p className="text-2xl font-bold text-green-600 mt-1" data-testid="metric-fleet-roi">
                        {roiAnalysis?.fleetROI?.avgROI ? 
                          Math.round(roiAnalysis.fleetROI.avgROI) : 0}%
                      </p>
                    </div>
                    <div className="bg-green-100 p-3 rounded-lg">
                      <DollarSign className="text-green-600" size={20} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm">Total Investment</p>
                      <p className="text-2xl font-bold text-blue-600 mt-1" data-testid="metric-investment">
                        ${roiAnalysis?.fleetROI?.totalInvestment ? 
                          (roiAnalysis.fleetROI.totalInvestment / 1000).toFixed(0) : 0}K
                      </p>
                    </div>
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <TrendingUp className="text-blue-600" size={20} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm">Optimization Potential</p>
                      <p className="text-2xl font-bold text-orange-600 mt-1" data-testid="metric-optimization">
                        ${costOptimization?.summary?.totalPotentialSavings ? 
                          (costOptimization.summary.totalPotentialSavings / 1000).toFixed(0) : 0}K
                      </p>
                    </div>
                    <div className="bg-orange-100 p-3 rounded-lg">
                      <Lightbulb className="text-orange-600" size={20} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm">At-Risk Equipment</p>
                      <p className="text-2xl font-bold text-red-600 mt-1" data-testid="metric-at-risk">
                        {roiAnalysis?.fleetROI?.equipmentAtRisk || 0}
                      </p>
                    </div>
                    <div className="bg-red-100 p-3 rounded-lg">
                      <AlertTriangle className="text-red-600" size={20} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ROI Analysis & Cost Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="overflow-x-auto">
                    <div className="flex items-center whitespace-nowrap min-w-0 pb-1">
                      <DollarSign className="mr-2 h-5 w-5 flex-shrink-0" />
                      <span className="flex-shrink-0">Equipment ROI Analysis</span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {roiLoading ? (
                    <div className="flex items-center justify-center h-64 text-muted-foreground">Loading ROI data...</div>
                  ) : roiAnalysis?.equipmentROI?.length ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsBarChart 
                        data={roiAnalysis.equipmentROI.map((roi: any) => ({
                          equipment: roi.equipmentId,
                          roi: roi.roi,
                          uptime: roi.currentUptime,
                          riskLevel: roi.riskLevel
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="equipment" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value, name) => [
                            name === 'roi' ? `${value}%` : `${value}%`,
                            name === 'roi' ? 'ROI' : 'Uptime'
                          ]}
                          labelFormatter={(label) => `Equipment: ${label}`}
                        />
                        <Legend />
                        <Bar dataKey="roi" fill="#10b981" name="ROI %" />
                        <Bar dataKey="uptime" fill="#3b82f6" name="Uptime %" />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-muted-foreground">
                      No ROI data available
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="overflow-x-auto">
                    <div className="flex items-center whitespace-nowrap min-w-0 pb-1">
                      <BarChart className="mr-2 h-5 w-5 flex-shrink-0" />
                      <span className="flex-shrink-0">Advanced Cost Trends</span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {advancedCostTrendsLoading ? (
                    <div className="flex items-center justify-center h-64 text-muted-foreground">Loading cost trends...</div>
                  ) : advancedCostTrends?.monthlyTrends?.length ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={advancedCostTrends.monthlyTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip 
                          formatter={(value, name) => {
                            if (name === 'Health Score') return [`${value}%`, 'Health Score'];
                            return [`$${value}`, 'Cost'];
                          }}
                          labelFormatter={(label) => `Month: ${label}`}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="totalCosts" 
                          stroke="#ef4444" 
                          strokeWidth={2}
                          yAxisId="left"
                          name="Total Costs"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="avgHealthScore" 
                          stroke="#10b981" 
                          strokeWidth={2}
                          yAxisId="right"
                          name="Health Score"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-muted-foreground">
                      No cost trend data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Cost Optimization Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="overflow-x-auto">
                  <div className="flex items-center whitespace-nowrap min-w-0 pb-1">
                    <Lightbulb className="mr-2 h-5 w-5 flex-shrink-0" />
                    <span className="flex-shrink-0">Cost Optimization Recommendations</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {costOptimizationLoading ? (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">Loading recommendations...</div>
                ) : costOptimization?.recommendations?.length ? (
                  <div className="space-y-4">
                    {costOptimization.recommendations.slice(0, 8).map((rec: any, index: number) => (
                      <div key={index} className="border border-border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium text-foreground">{rec.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant={
                              rec.priority === 'critical' ? 'destructive' :
                              rec.priority === 'high' ? 'secondary' : 'outline'
                            }>
                              {rec.priority}
                            </Badge>
                            <p className="text-sm font-medium text-green-600 mt-1">
                              Save ${rec.potentialSavings.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {rec.actionItems?.slice(0, 3).map((action: string, idx: number) => (
                            <div key={idx} className="text-xs text-muted-foreground flex items-center">
                              <div className="w-1 h-1 bg-muted-foreground rounded-full mr-2"></div>
                              {action}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    No optimization recommendations available
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