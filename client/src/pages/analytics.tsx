import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { RefreshCw, TrendingUp, Calendar, Filter, Activity, BarChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart as RechartsBarChart, Bar, AreaChart, Area } from "recharts";
import { fetchTelemetryTrends, fetchTelemetryHistory, fetchDevices } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { formatDistanceToNow, format } from "date-fns";

export default function Analytics() {
  const [selectedEquipment, setSelectedEquipment] = useState<string>("all");
  const [selectedSensorType, setSelectedSensorType] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<number>(24);
  const [chartType, setChartType] = useState<"line" | "area" | "bar">("line");

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
      acc[key] = {
        name: `${reading.equipmentId} ${reading.sensorType}`,
        equipmentId: reading.equipmentId,
        sensorType: reading.sensorType,
        value: reading.value,
        unit: reading.unit,
        status: reading.status,
        lastReading: reading.ts,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Telemetry Analytics</h2>
            <p className="text-muted-foreground">Real-time equipment sensor monitoring and trends</p>
          </div>
          <div className="flex items-center space-x-4">
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
      </div>
    </div>
  );
}