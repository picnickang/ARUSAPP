import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle, Clock, Ship, Search, AlertTriangle, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import type { Vessel, Equipment, DtcFault, DtcDefinition } from "@shared/schema";

interface EnrichedDtcFault extends DtcFault {
  definition?: DtcDefinition;
  equipmentId?: string;
}

export default function Diagnostics() {
  const [selectedVessel, setSelectedVessel] = useState<string>("all");
  const [selectedEquipment, setSelectedEquipment] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch vessels
  const { data: vessels = [] } = useQuery<Vessel[]>({
    queryKey: ["/api/vessels"],
    refetchInterval: 300000,
  });

  // Fetch equipment
  const { data: allEquipment = [] } = useQuery<Equipment[]>({
    queryKey: ["/api/equipment"],
    refetchInterval: 60000,
  });

  // Filter equipment by selected vessel
  const filteredEquipment = selectedVessel === "all" 
    ? allEquipment 
    : allEquipment.filter(eq => eq.vesselId === selectedVessel);

  // Fetch active DTCs for all equipment or selected equipment
  const equipmentIds = selectedEquipment === "all" 
    ? filteredEquipment.map(eq => eq.id)
    : [selectedEquipment];

  // Fetch active DTCs for each equipment
  const activeDtcQueries = useQuery<EnrichedDtcFault[]>({
    queryKey: ["/api/dtc/active", equipmentIds],
    queryFn: async () => {
      const results = await Promise.all(
        equipmentIds.map(async (eqId) => {
          try {
            const data = await apiRequest("GET", `/api/equipment/${eqId}/dtc/active`);
            return data.map((dtc: EnrichedDtcFault) => ({ ...dtc, equipmentId: eqId }));
          } catch {
            return [];
          }
        })
      );
      return results.flat();
    },
    enabled: equipmentIds.length > 0,
    refetchInterval: 30000,
  });

  const activeDtcs = activeDtcQueries.data || [];

  // Apply search filter
  const filteredActiveDtcs = activeDtcs.filter(dtc => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      dtc.spn?.toString().includes(query) ||
      dtc.fmi?.toString().includes(query) ||
      dtc.definition?.description?.toLowerCase().includes(query) ||
      dtc.definition?.spnName?.toLowerCase().includes(query) ||
      dtc.definition?.fmiName?.toLowerCase().includes(query)
    );
  });

  // Calculate statistics
  const totalActiveFaults = activeDtcs.length;
  const criticalFaults = activeDtcs.filter(dtc => dtc.definition?.severity === 1 || dtc.definition?.severity === 2).length;
  const warningFaults = activeDtcs.filter(dtc => dtc.definition?.severity === 3).length;
  const infoFaults = activeDtcs.filter(dtc => dtc.definition?.severity === 4).length;

  const getSeverityColor = (severity?: number) => {
    switch (severity) {
      case 1:
      case 2:
        return "destructive";
      case 3:
        return "default";
      case 4:
        return "secondary";
      default:
        return "outline";
    }
  };

  const getSeverityIcon = (severity?: number) => {
    switch (severity) {
      case 1:
      case 2:
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 3:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSeverityLabel = (severity?: number) => {
    switch (severity) {
      case 1: return "critical";
      case 2: return "high";
      case 3: return "moderate";
      case 4: return "low";
      default: return "unknown";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Diagnostics</h2>
            <p className="text-muted-foreground">ECM fault codes and diagnostic trouble codes (DTCs)</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <Ship className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Select value={selectedVessel} onValueChange={(v) => {
                setSelectedVessel(v);
                setSelectedEquipment("all");
              }}>
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
            <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
              <SelectTrigger className="w-56" data-testid="select-equipment-filter">
                <SelectValue placeholder="Select equipment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Equipment</SelectItem>
                {filteredEquipment.map((eq) => (
                  <SelectItem key={eq.id} value={eq.id}>
                    {eq.name || eq.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Statistics Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Active Faults</p>
                  <p className="text-2xl font-bold text-foreground mt-1" data-testid="metric-active-faults">
                    {totalActiveFaults}
                  </p>
                </div>
                <div className="bg-primary/20 p-3 rounded-lg">
                  <AlertCircle className="text-primary" size={20} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Critical</p>
                  <p className="text-2xl font-bold text-destructive mt-1" data-testid="metric-critical-faults">
                    {criticalFaults}
                  </p>
                </div>
                <div className="bg-destructive/20 p-3 rounded-lg">
                  <AlertCircle className="text-destructive" size={20} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Warnings</p>
                  <p className="text-2xl font-bold text-yellow-500 mt-1" data-testid="metric-warning-faults">
                    {warningFaults}
                  </p>
                </div>
                <div className="bg-yellow-500/20 p-3 rounded-lg">
                  <AlertTriangle className="text-yellow-500" size={20} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Info</p>
                  <p className="text-2xl font-bold text-blue-500 mt-1" data-testid="metric-info-faults">
                    {infoFaults}
                  </p>
                </div>
                <div className="bg-blue-500/20 p-3 rounded-lg">
                  <FileText className="text-blue-500" size={20} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by SPN, FMI, description, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-dtc"
          />
        </div>

        {/* Active Faults List */}
        <Card>
          <CardHeader>
            <CardTitle>Active Fault Codes</CardTitle>
            <CardDescription>
              Currently active diagnostic trouble codes across selected equipment
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeDtcQueries.isLoading ? (
              <div className="space-y-3">
                <div className="h-20 bg-muted/50 rounded-lg animate-pulse" />
                <div className="h-20 bg-muted/50 rounded-lg animate-pulse" />
              </div>
            ) : activeDtcQueries.isError ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
                <p className="text-muted-foreground">Failed to load fault codes</p>
              </div>
            ) : filteredActiveDtcs.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {searchQuery 
                    ? "No faults match your search criteria"
                    : "No active fault codes - all systems healthy!"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredActiveDtcs.map((dtc, index) => {
                  const equipment = allEquipment.find(eq => eq.id === dtc.equipmentId);
                  const vessel = vessels.find(v => v.id === equipment?.vesselId);
                  
                  return (
                    <div
                      key={`${dtc.equipmentId}-${dtc.spn}-${dtc.fmi}-${index}`}
                      className="p-4 bg-muted/50 rounded-lg border border-border hover:border-primary/50 transition-colors"
                      data-testid={`dtc-fault-${index}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          {getSeverityIcon(dtc.definition?.severity)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-mono font-semibold text-foreground">
                                SPN {dtc.spn} / FMI {dtc.fmi}
                              </span>
                              <Badge variant={getSeverityColor(dtc.definition?.severity)} className="capitalize">
                                {getSeverityLabel(dtc.definition?.severity)}
                              </Badge>
                            </div>
                            <p className="text-foreground mb-2">
                              {dtc.definition?.description || "No description available"}
                            </p>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Ship className="h-3 w-3" />
                                {vessel?.name || "Unknown vessel"}
                              </span>
                              <span>→ {equipment?.name || equipment?.id || "Unknown equipment"}</span>
                              {dtc.oc && dtc.oc > 1 && (
                                <span className="font-medium text-yellow-600">
                                  {dtc.oc} occurrences
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-sm text-muted-foreground whitespace-nowrap">
                          <div className="flex items-center gap-1 justify-end mb-1">
                            <Clock className="h-3 w-3" />
                            {dtc.firstSeen && formatDistanceToNow(new Date(dtc.firstSeen), { addSuffix: true })}
                          </div>
                          {dtc.lastSeen && (
                            <div className="text-xs">
                              Last: {format(new Date(dtc.lastSeen), "MMM d, HH:mm")}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
