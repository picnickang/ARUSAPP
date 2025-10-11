import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Heart, TrendingUp, AlertTriangle, Activity, Ship } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatusIndicator } from "@/components/status-indicator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchEquipmentHealth, fetchPdmScores } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import type { Vessel } from "@shared/schema";

export default function HealthMonitor() {
  const [selectedVessel, setSelectedVessel] = useState<string>("all");

  // Fetch vessels for dropdown
  const { data: vessels = [] } = useQuery<Vessel[]>({
    queryKey: ["/api/vessels"],
    refetchInterval: 300000, // 5 minutes - vessel data is relatively stable
  });

  const { data: equipmentHealth, isLoading: healthLoading } = useQuery({
    queryKey: ["/api/equipment/health", selectedVessel],
    queryFn: () => fetchEquipmentHealth(selectedVessel !== "all" ? selectedVessel : undefined),
    refetchInterval: 30000,
  });

  const { data: pdmScores, isLoading: scoresLoading } = useQuery({
    queryKey: ["/api/pdm/scores"],
    queryFn: () => fetchPdmScores(),
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

  if (healthLoading || scoresLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading health data...</div>
      </div>
    );
  }

  const healthyCount = equipmentHealth?.filter(e => e.status === "healthy").length || 0;
  const warningCount = equipmentHealth?.filter(e => e.status === "warning").length || 0;
  const criticalCount = equipmentHealth?.filter(e => e.status === "critical").length || 0;
  const totalEquipment = equipmentHealth?.length || 0;

  const averageHealth = totalEquipment > 0 
    ? Math.round(equipmentHealth!.reduce((sum, eq) => sum + eq.healthIndex, 0) / totalEquipment)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Health Monitor</h2>
            <p className="text-muted-foreground">Real-time equipment health and predictive maintenance analytics</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Ship className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedVessel} onValueChange={setSelectedVessel}>
                <SelectTrigger className="w-48" data-testid="select-vessel-filter">
                  <SelectValue placeholder="Select vessel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vessels</SelectItem>
                  {vessels.map((vessel) => (
                    <SelectItem key={vessel.id} value={vessel.id}>
                      {vessel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Health Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Fleet Health</p>
                  <p className="text-2xl font-bold text-foreground mt-1" data-testid="metric-fleet-health">
                    {averageHealth}%
                  </p>
                </div>
                <div className="bg-chart-3/20 p-3 rounded-lg">
                  <Heart className="text-chart-3" size={20} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Healthy Equipment</p>
                  <p className="text-2xl font-bold text-chart-3 mt-1" data-testid="metric-healthy-equipment">
                    {healthyCount}
                  </p>
                </div>
                <div className="bg-chart-3/20 p-3 rounded-lg">
                  <Activity className="text-chart-3" size={20} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Warnings</p>
                  <p className="text-2xl font-bold text-chart-2 mt-1" data-testid="metric-warning-equipment">
                    {warningCount}
                  </p>
                </div>
                <div className="bg-chart-2/20 p-3 rounded-lg">
                  <TrendingUp className="text-chart-2" size={20} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Critical</p>
                  <p className="text-2xl font-bold text-destructive mt-1" data-testid="metric-critical-equipment">
                    {criticalCount}
                  </p>
                </div>
                <div className="bg-destructive/20 p-3 rounded-lg">
                  <AlertTriangle className="text-destructive" size={20} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Equipment Health Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Equipment Health Status</CardTitle>
              <p className="text-sm text-muted-foreground">
                Current health indices and maintenance predictions
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {equipmentHealth?.map((equipment) => (
                <div 
                  key={equipment.id} 
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                  data-testid={`equipment-health-${equipment.id}`}
                >
                  <div className="flex items-center space-x-3">
                    <StatusIndicator status={equipment.status} />
                    <div>
                      <p className="font-medium text-foreground">{equipment.name || equipment.id}</p>
                      <p className="text-sm text-muted-foreground">
                        {equipment.type && <span className="mr-2">{equipment.type}</span>}
                        {equipment.vessel}
                      </p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="flex items-center space-x-2">
                      <Progress 
                        value={equipment.healthIndex} 
                        className="w-20 h-2"
                      />
                      <span className={`text-sm font-medium ${
                        equipment.healthIndex >= 75 ? "text-chart-3" :
                        equipment.healthIndex >= 50 ? "text-chart-2" : "text-destructive"
                      }`}>
                        {equipment.healthIndex}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Due in {equipment.predictedDueDays} days
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Health Scores</CardTitle>
              <p className="text-sm text-muted-foreground">
                Latest predictive maintenance assessments
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {pdmScores?.slice(0, 10).map((score) => (
                <div 
                  key={score.id} 
                  className="flex items-center justify-between p-3 border border-border rounded-lg"
                  data-testid={`pdm-score-${score.id}`}
                >
                  <div>
                    <p className="font-medium text-foreground">{getEquipmentName(score.equipmentId)}</p>
                    <p className="text-xs text-muted-foreground">
                      {score.ts ? formatDistanceToNow(new Date(score.ts), { addSuffix: true }) : "Unknown"}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className={`text-sm font-medium ${
                      (score.healthIdx || 0) >= 75 ? "text-chart-3" :
                      (score.healthIdx || 0) >= 50 ? "text-chart-2" : "text-destructive"
                    }`}>
                      Health: {score.healthIdx || 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Failure risk: {((score.pFail30d || 0) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Health Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Health Analytics</CardTitle>
            <p className="text-sm text-muted-foreground">
              Equipment performance insights and trending data
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-chart-3" data-testid="metric-avg-health">
                  {averageHealth}%
                </p>
                <p className="text-sm text-muted-foreground">Average Health</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-chart-2" data-testid="metric-avg-failure-risk">
                  {(pdmScores?.length || 0) > 0 
                    ? ((pdmScores!.reduce((sum, s) => sum + (s.pFail30d || 0), 0) / pdmScores!.length) * 100).toFixed(1)
                    : "0.0"
                  }%
                </p>
                <p className="text-sm text-muted-foreground">Avg. Failure Risk</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-foreground" data-testid="metric-equipment-monitored">
                  {totalEquipment}
                </p>
                <p className="text-sm text-muted-foreground">Equipment Monitored</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
