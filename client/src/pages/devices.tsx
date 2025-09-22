import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Edit, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatusIndicator } from "@/components/status-indicator";
import { fetchDevices } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { queryClient } from "@/lib/queryClient";

export default function Devices() {
  const { data: devices, isLoading, error } = useQuery({
    queryKey: ["/api/devices"],
    queryFn: fetchDevices,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading devices...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-destructive">Error loading devices: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Device Management</h2>
            <p className="text-muted-foreground">Monitor and configure edge devices across your fleet</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              data-testid="button-add-device"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Device
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Device Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Total Devices</p>
                  <p className="text-2xl font-bold text-foreground mt-1" data-testid="stat-total-devices">
                    {devices?.length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Online</p>
                  <p className="text-2xl font-bold text-chart-3 mt-1" data-testid="stat-online-devices">
                    {devices?.filter(d => d.status === "Online").length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Warning</p>
                  <p className="text-2xl font-bold text-chart-2 mt-1" data-testid="stat-warning-devices">
                    {devices?.filter(d => d.status === "Warning").length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Critical</p>
                  <p className="text-2xl font-bold text-destructive mt-1" data-testid="stat-critical-devices">
                    {devices?.filter(d => d.status === "Critical").length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Device List */}
        <Card>
          <CardHeader>
            <CardTitle>Device Registry</CardTitle>
            <p className="text-sm text-muted-foreground">
              Manage your fleet's edge devices and monitoring endpoints
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device ID</TableHead>
                    <TableHead>Vessel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>System Health</TableHead>
                    <TableHead>Software Version</TableHead>
                    <TableHead>Last Seen</TableHead>
                    <TableHead>Sensors</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices?.map((device) => {
                    const sensors = device.sensors ? JSON.parse(device.sensors) : [];
                    const sensorCount = sensors.length;
                    
                    return (
                      <TableRow key={device.id} className="hover:bg-muted">
                        <TableCell className="font-mono text-sm" data-testid={`device-id-${device.id}`}>
                          {device.id}
                        </TableCell>
                        <TableCell data-testid={`device-vessel-${device.id}`}>
                          {device.vessel || "Unassigned"}
                        </TableCell>
                        <TableCell>
                          <StatusIndicator status={device.status} showLabel />
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2 text-xs">
                              <span className="text-muted-foreground">CPU:</span>
                              <span data-testid={`device-cpu-${device.id}`}>
                                {device.lastHeartbeat?.cpuPct ? `${device.lastHeartbeat.cpuPct}%` : "–"}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 text-xs">
                              <span className="text-muted-foreground">Mem:</span>
                              <span data-testid={`device-memory-${device.id}`}>
                                {device.lastHeartbeat?.memPct ? `${device.lastHeartbeat.memPct}%` : "–"}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 text-xs">
                              <span className="text-muted-foreground">Disk:</span>
                              <span data-testid={`device-disk-${device.id}`}>
                                {device.lastHeartbeat?.diskFreeGb ? `${device.lastHeartbeat.diskFreeGb}GB` : "–"}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell data-testid={`device-version-${device.id}`}>
                          {device.lastHeartbeat?.swVersion || "Unknown"}
                        </TableCell>
                        <TableCell data-testid={`device-last-seen-${device.id}`}>
                          {device.lastHeartbeat?.ts 
                            ? formatDistanceToNow(new Date(device.lastHeartbeat.ts), { addSuffix: true })
                            : "Never"
                          }
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" data-testid={`device-sensor-count-${device.id}`}>
                            {sensorCount} sensors
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              data-testid={`button-edit-device-${device.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              data-testid={`button-configure-device-${device.id}`}
                            >
                              <SettingsIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
