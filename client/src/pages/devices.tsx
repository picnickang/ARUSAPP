import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Edit, Settings as SettingsIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatusIndicator } from "@/components/status-indicator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fetchDevices } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Device, InsertDevice } from "@shared/schema";

export default function Devices() {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [formData, setFormData] = useState<Partial<InsertDevice>>({
    id: '',
    vessel: '',
    buses: '',
    sensors: '',
    config: '',
    hmacKey: ''
  });
  const { toast } = useToast();

  const { data: devices, isLoading, error } = useQuery({
    queryKey: ["/api/devices"],
    queryFn: fetchDevices,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const createDeviceMutation = useMutation({
    mutationFn: (deviceData: InsertDevice) => 
      apiRequest("POST", "/api/devices", deviceData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      setAddModalOpen(false);
      resetForm();
      toast({ title: "Device created successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create device", 
        description: error?.message || "An error occurred",
        variant: "destructive" 
      });
    }
  });

  const updateDeviceMutation = useMutation({
    mutationFn: (data: { id: string; updates: Partial<InsertDevice> }) => 
      apiRequest("PUT", `/api/devices/${data.id}`, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      setEditModalOpen(false);
      setSelectedDevice(null);
      resetForm();
      toast({ title: "Device updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update device", 
        description: error?.message || "An error occurred",
        variant: "destructive" 
      });
    }
  });

  const deleteDeviceMutation = useMutation({
    mutationFn: (deviceId: string) => 
      apiRequest("DELETE", `/api/devices/${deviceId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      toast({ title: "Device deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete device", 
        description: error?.message || "An error occurred",
        variant: "destructive" 
      });
    }
  });

  const resetForm = () => {
    setFormData({
      id: '',
      vessel: '',
      buses: '',
      sensors: '',
      config: '',
      hmacKey: ''
    });
  };

  const handleAdd = () => {
    resetForm();
    setAddModalOpen(true);
  };

  const handleEdit = (device: Device) => {
    setSelectedDevice(device);
    setFormData({
      id: device.id,
      vessel: device.vessel || '',
      buses: device.buses || '',
      sensors: device.sensors || '',
      config: device.config || '',
      hmacKey: device.hmacKey || ''
    });
    setEditModalOpen(true);
  };

  const handleDelete = (device: Device) => {
    if (confirm(`Are you sure you want to delete device "${device.id}"? This action cannot be undone.`)) {
      deleteDeviceMutation.mutate(device.id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.id?.trim()) {
      toast({ 
        title: "Validation Error", 
        description: "Device ID is required",
        variant: "destructive" 
      });
      return;
    }

    const deviceData: InsertDevice = {
      id: formData.id!.trim(),
      vessel: formData.vessel?.trim() || null,
      buses: formData.buses?.trim() || null,
      sensors: formData.sensors?.trim() || null,
      config: formData.config?.trim() || null,
      hmacKey: formData.hmacKey?.trim() || null
    };

    if (selectedDevice) {
      updateDeviceMutation.mutate({ id: selectedDevice.id, updates: deviceData });
    } else {
      createDeviceMutation.mutate(deviceData);
    }
  };

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
            <h2 className="text-2xl font-bold text-foreground">Vessel Management</h2>
            <p className="text-muted-foreground">Monitor and configure edge devices across your fleet</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              onClick={handleAdd}
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
                              onClick={() => handleEdit(device)}
                              data-testid={`button-edit-device-${device.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDelete(device)}
                              className="text-destructive hover:text-destructive"
                              data-testid={`button-delete-device-${device.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
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

      {/* Add Device Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Device</DialogTitle>
            <DialogDescription>
              Register a new edge device to your marine fleet monitoring system.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deviceId">Device ID *</Label>
                <Input
                  id="deviceId"
                  value={formData.id}
                  onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value }))}
                  placeholder="DEV-001"
                  data-testid="input-device-id"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vessel">Vessel Name</Label>
                <Input
                  id="vessel"
                  value={formData.vessel || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, vessel: e.target.value }))}
                  placeholder="MV Atlantic"
                  data-testid="input-vessel"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="buses">Data Buses (JSON Array)</Label>
              <Textarea
                id="buses"
                value={formData.buses || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, buses: e.target.value }))}
                placeholder='["modbus_rtu", "can_bus", "ethernet"]'
                rows={2}
                data-testid="input-buses"
              />
              <p className="text-xs text-muted-foreground">
                List of data buses as JSON array (e.g., ["modbus_rtu", "can_bus"])
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sensors">Sensors (JSON Array)</Label>
              <Textarea
                id="sensors"
                value={formData.sensors || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, sensors: e.target.value }))}
                placeholder='["temperature", "pressure", "vibration", "flow_rate"]'
                rows={2}
                data-testid="input-sensors"
              />
              <p className="text-xs text-muted-foreground">
                List of sensor types as JSON array (e.g., ["temperature", "pressure"])
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="config">Device Configuration (JSON)</Label>
              <Textarea
                id="config"
                value={formData.config || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, config: e.target.value }))}
                placeholder='{"sampling_rate": 1000, "buffer_size": 512}'
                rows={3}
                data-testid="input-config"
              />
              <p className="text-xs text-muted-foreground">
                Device configuration as JSON object
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hmacKey">HMAC Key (Optional)</Label>
              <Input
                id="hmacKey"
                type="password"
                value={formData.hmacKey || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, hmacKey: e.target.value }))}
                placeholder="Enter HMAC key for secure communication"
                data-testid="input-hmac-key"
              />
              <p className="text-xs text-muted-foreground">
                Optional HMAC key for authenticated communication
              </p>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setAddModalOpen(false)}
                data-testid="button-cancel-add"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createDeviceMutation.isPending}
                data-testid="button-submit-add"
              >
                {createDeviceMutation.isPending ? "Creating..." : "Create Device"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Device Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Device</DialogTitle>
            <DialogDescription>
              Update the configuration for {selectedDevice?.id}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editDeviceId">Device ID</Label>
                <Input
                  id="editDeviceId"
                  value={formData.id}
                  disabled
                  className="bg-muted"
                  data-testid="input-edit-device-id"
                />
                <p className="text-xs text-muted-foreground">
                  Device ID cannot be changed after creation
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editVessel">Vessel Name</Label>
                <Input
                  id="editVessel"
                  value={formData.vessel || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, vessel: e.target.value }))}
                  placeholder="MV Atlantic"
                  data-testid="input-edit-vessel"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="editBuses">Data Buses (JSON Array)</Label>
              <Textarea
                id="editBuses"
                value={formData.buses || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, buses: e.target.value }))}
                placeholder='["modbus_rtu", "can_bus", "ethernet"]'
                rows={2}
                data-testid="input-edit-buses"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editSensors">Sensors (JSON Array)</Label>
              <Textarea
                id="editSensors"
                value={formData.sensors || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, sensors: e.target.value }))}
                placeholder='["temperature", "pressure", "vibration", "flow_rate"]'
                rows={2}
                data-testid="input-edit-sensors"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editConfig">Device Configuration (JSON)</Label>
              <Textarea
                id="editConfig"
                value={formData.config || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, config: e.target.value }))}
                placeholder='{"sampling_rate": 1000, "buffer_size": 512}'
                rows={3}
                data-testid="input-edit-config"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editHmacKey">HMAC Key</Label>
              <Input
                id="editHmacKey"
                type="password"
                value={formData.hmacKey || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, hmacKey: e.target.value }))}
                placeholder="Enter HMAC key for secure communication"
                data-testid="input-edit-hmac-key"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setEditModalOpen(false)}
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateDeviceMutation.isPending}
                data-testid="button-submit-edit"
              >
                {updateDeviceMutation.isPending ? "Updating..." : "Update Device"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
