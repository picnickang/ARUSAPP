import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Save, Edit, Trash2, Settings, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { StatusIndicator } from "@/components/status-indicator";
import type { SensorConfiguration, Device } from "@shared/schema";

interface SensorConfigFormData {
  equipmentId: string;
  sensorType: string;
  enabled: boolean;
  gain: number;
  offset: number;
  minValid: number | null;
  maxValid: number | null;
  deadband: number | null;
  critHi: number | null;
  critLo: number | null;
  warnHi: number | null;
  warnLo: number | null;
  hysteresis: number | null;
  emaAlpha: number | null;
  orgId: string;
}

const defaultFormData: SensorConfigFormData = {
  equipmentId: "",
  sensorType: "",
  enabled: true,
  gain: 1.0,
  offset: 0.0,
  minValid: null,
  maxValid: null,
  deadband: null,
  critHi: null,
  critLo: null,
  warnHi: null,
  warnLo: null,
  hysteresis: 0.0,
  emaAlpha: null,
  orgId: "default-org-id"
};

const commonSensorTypes = [
  "temperature", "pressure", "voltage", "current", "frequency", 
  "vibration", "flow_rate", "level", "rpm", "power", "efficiency"
];

export default function SensorConfig() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<SensorConfigFormData>(defaultFormData);
  const [editingConfig, setEditingConfig] = useState<SensorConfiguration | null>(null);

  // Fetch devices for equipment selection
  const { data: devices = [] } = useQuery<Device[]>({
    queryKey: ["/api/devices"],
  });

  // Fetch sensor configurations
  const { data: sensorConfigs = [], isLoading, refetch } = useQuery<SensorConfiguration[]>({
    queryKey: ["/api/sensor-configs"],
  });

  // Fetch sensor status (online/offline based on telemetry)
  const { data: sensorStatus = [] } = useQuery<Array<{
    id: string;
    status: 'online' | 'offline';
    lastTelemetry: string | null;
    lastValue: number | null;
  }>>({
    queryKey: ["/api/sensor-configs/status"],
  });

  // Create sensor configuration mutation
  const createConfigMutation = useMutation({
    mutationFn: (data: SensorConfigFormData) => 
      apiRequest('POST', '/api/sensor-configs', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sensor-configs"] });
      setIsDialogOpen(false);
      setFormData(defaultFormData);
      toast({
        title: "Configuration Created",
        description: "Sensor configuration has been successfully created.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update sensor configuration mutation
  const updateConfigMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: Partial<SensorConfigFormData> }) => 
      apiRequest('PUT', `/api/sensor-configs/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sensor-configs"] });
      setIsDialogOpen(false);
      setEditingConfig(null);
      setFormData(defaultFormData);
      toast({
        title: "Configuration Updated",
        description: "Sensor configuration has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete sensor configuration mutation
  const deleteConfigMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/sensor-configs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sensor-configs"] });
      toast({
        title: "Configuration Deleted",
        description: "Sensor configuration has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    setEditingConfig(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const handleEdit = (config: SensorConfiguration) => {
    setEditingConfig(config);
    setFormData({
      equipmentId: config.equipmentId,
      sensorType: config.sensorType,
      enabled: config.enabled ?? true,
      gain: config.gain ?? 1.0,
      offset: config.offset ?? 0.0,
      minValid: config.minValid,
      maxValid: config.maxValid,
      deadband: config.deadband,
      critHi: config.critHi,
      critLo: config.critLo,
      warnHi: config.warnHi,
      warnLo: config.warnLo,
      hysteresis: config.hysteresis,
      emaAlpha: config.emaAlpha,
      orgId: config.orgId
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (editingConfig) {
      updateConfigMutation.mutate({ id: editingConfig.id, data: formData });
    } else {
      createConfigMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    deleteConfigMutation.mutate(id);
  };

  const handleFieldChange = (field: keyof SensorConfigFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      // Clear editing state when dialog closes to avoid stale data
      setEditingConfig(null);
      setFormData(defaultFormData);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Sensor Configuration</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-5/6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="sensor-config-page">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" data-testid="page-title">Sensor Configuration</h1>
          <p className="text-muted-foreground mt-2">
            Configure sensor processing parameters for enhanced telemetry analysis
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              toast({
                title: "Refreshing configurations...",
                description: "Fetching latest sensor data",
              });
              refetch();
              setTimeout(() => {
                toast({
                  title: "Configurations refreshed",
                  description: "Sensor configurations updated",
                });
              }, 500);
            }}
            disabled={isLoading}
            data-testid="button-refresh"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleCreate} data-testid="button-create-config">
            <Plus className="h-4 w-4 mr-2" />
            New Configuration
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Sensor Configurations ({sensorConfigs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sensorConfigs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Settings className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Sensor Configurations</h3>
              <p className="mb-4">Create your first sensor configuration to start processing telemetry data.</p>
              <Button onClick={handleCreate} data-testid="button-create-first-config">
                <Plus className="h-4 w-4 mr-2" />
                Create Configuration
              </Button>
            </div>
          ) : (
            <>
              {/* Sensor Status Summary */}
              <div className="mb-4 p-3 bg-muted/50 rounded-lg flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground">
                    Total: <span className="font-semibold text-foreground">{sensorConfigs.length}</span>
                  </span>
                  <span className="text-muted-foreground">
                    Online: <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {sensorStatus.filter(s => s.status === 'online').length}
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    Offline: <span className="font-semibold text-red-600 dark:text-red-400">
                      {sensorStatus.filter(s => s.status === 'offline').length}
                    </span>
                  </span>
                </div>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Sensor Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Scaling</TableHead>
                    <TableHead>Thresholds</TableHead>
                    <TableHead>EMA</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {sensorConfigs.map((config: SensorConfiguration) => {
                  const status = sensorStatus.find(s => s.id === config.id);
                  const isOnline = status?.status === 'online';
                  const isConfigEnabled = config.enabled;
                  
                  return (
                    <TableRow 
                      key={config.id} 
                      data-testid={`row-config-${config.id}`}
                      className={!isOnline && isConfigEnabled ? 'bg-orange-500/5 border-l-2 border-l-orange-500' : ''}
                    >
                      <TableCell className="font-medium">{config.equipmentId}</TableCell>
                      <TableCell>{config.sensorType}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <StatusIndicator 
                              status={status?.status || 'offline'} 
                              showLabel={true}
                            />
                            {!isOnline && isConfigEnabled && (
                              <Badge variant="outline" className="text-orange-600 border-orange-600 text-xs">
                                No Data
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            Config: {config.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {config.gain}x + {config.offset}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {config.critHi != null && (
                          <div className="text-red-600">Crit Hi: {config.critHi}</div>
                        )}
                        {config.warnHi != null && (
                          <div className="text-yellow-600">Warn Hi: {config.warnHi}</div>
                        )}
                        {config.warnLo != null && (
                          <div className="text-yellow-600">Warn Lo: {config.warnLo}</div>
                        )}
                        {config.critLo != null && (
                          <div className="text-red-600">Crit Lo: {config.critLo}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {config.emaAlpha ? (
                        <span className="text-sm text-muted-foreground">α = {config.emaAlpha}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Disabled</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(config)}
                          data-testid={`button-edit-${config.id}`}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              data-testid={`button-delete-${config.id}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Configuration</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete the sensor configuration for {config.equipmentId}/{config.sensorType}?
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(config.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? 'Edit Sensor Configuration' : 'Create Sensor Configuration'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            {/* Basic Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Basic Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="equipmentId">Equipment</Label>
                  <Select
                    value={formData.equipmentId}
                    onValueChange={(value) => handleFieldChange('equipmentId', value)}
                  >
                    <SelectTrigger data-testid="select-equipment">
                      <SelectValue placeholder="Select equipment" />
                    </SelectTrigger>
                    <SelectContent>
                      {devices.map((device) => (
                        <SelectItem key={device.id} value={device.id}>
                          {device.id} - {device.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="sensorType">Sensor Type</Label>
                  <Select
                    value={formData.sensorType}
                    onValueChange={(value) => handleFieldChange('sensorType', value)}
                  >
                    <SelectTrigger data-testid="select-sensor-type">
                      <SelectValue placeholder="Select sensor type" />
                    </SelectTrigger>
                    <SelectContent>
                      {commonSensorTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="enabled"
                    checked={formData.enabled}
                    onCheckedChange={(checked) => handleFieldChange('enabled', checked)}
                    data-testid="switch-enabled"
                  />
                  <Label htmlFor="enabled">Enabled</Label>
                </div>
              </CardContent>
            </Card>

            {/* Scaling Parameters */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Scaling Parameters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="gain">Gain (Multiplier)</Label>
                  <Input
                    id="gain"
                    type="number"
                    step="0.001"
                    value={formData.gain ?? ''}
                    onChange={(e) => handleFieldChange('gain', e.target.value === '' ? 1.0 : parseFloat(e.target.value))}
                    data-testid="input-gain"
                  />
                </div>

                <div>
                  <Label htmlFor="offset">Offset</Label>
                  <Input
                    id="offset"
                    type="number"
                    step="0.001"
                    value={formData.offset ?? ''}
                    onChange={(e) => handleFieldChange('offset', e.target.value === '' ? 0.0 : parseFloat(e.target.value))}
                    data-testid="input-offset"
                  />
                </div>

                <div>
                  <Label htmlFor="deadband">Deadband (Optional)</Label>
                  <Input
                    id="deadband"
                    type="number"
                    step="0.001"
                    value={formData.deadband ?? ''}
                    onChange={(e) => handleFieldChange('deadband', e.target.value === '' ? null : parseFloat(e.target.value))}
                    placeholder="No deadband filtering"
                    data-testid="input-deadband"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Validation Range */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Validation Range</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="minValid">Minimum Valid Value</Label>
                  <Input
                    id="minValid"
                    type="number"
                    step="0.001"
                    value={formData.minValid ?? ''}
                    onChange={(e) => handleFieldChange('minValid', e.target.value === '' ? null : parseFloat(e.target.value))}
                    placeholder="No minimum limit"
                    data-testid="input-min-valid"
                  />
                </div>

                <div>
                  <Label htmlFor="maxValid">Maximum Valid Value</Label>
                  <Input
                    id="maxValid"
                    type="number"
                    step="0.001"
                    value={formData.maxValid ?? ''}
                    onChange={(e) => handleFieldChange('maxValid', e.target.value === '' ? null : parseFloat(e.target.value))}
                    placeholder="No maximum limit"
                    data-testid="input-max-valid"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Threshold Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Alert Thresholds</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="critHi">Critical High</Label>
                  <Input
                    id="critHi"
                    type="number"
                    step="0.001"
                    value={formData.critHi ?? ''}
                    onChange={(e) => handleFieldChange('critHi', e.target.value === '' ? null : parseFloat(e.target.value))}
                    placeholder="No critical high threshold"
                    data-testid="input-crit-hi"
                  />
                </div>

                <div>
                  <Label htmlFor="warnHi">Warning High</Label>
                  <Input
                    id="warnHi"
                    type="number"
                    step="0.001"
                    value={formData.warnHi ?? ''}
                    onChange={(e) => handleFieldChange('warnHi', e.target.value === '' ? null : parseFloat(e.target.value))}
                    placeholder="No warning high threshold"
                    data-testid="input-warn-hi"
                  />
                </div>

                <div>
                  <Label htmlFor="warnLo">Warning Low</Label>
                  <Input
                    id="warnLo"
                    type="number"
                    step="0.001"
                    value={formData.warnLo ?? ''}
                    onChange={(e) => handleFieldChange('warnLo', e.target.value === '' ? null : parseFloat(e.target.value))}
                    placeholder="No warning low threshold"
                    data-testid="input-warn-lo"
                  />
                </div>

                <div>
                  <Label htmlFor="critLo">Critical Low</Label>
                  <Input
                    id="critLo"
                    type="number"
                    step="0.001"
                    value={formData.critLo ?? ''}
                    onChange={(e) => handleFieldChange('critLo', e.target.value === '' ? null : parseFloat(e.target.value))}
                    placeholder="No critical low threshold"
                    data-testid="input-crit-lo"
                  />
                </div>

                <div>
                  <Label htmlFor="hysteresis">Hysteresis</Label>
                  <Input
                    id="hysteresis"
                    type="number"
                    step="0.001"
                    value={formData.hysteresis ?? ''}
                    onChange={(e) => handleFieldChange('hysteresis', e.target.value === '' ? null : parseFloat(e.target.value))}
                    placeholder="No hysteresis"
                    data-testid="input-hysteresis"
                  />
                </div>
              </CardContent>
            </Card>

            {/* EMA Configuration */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm">Exponential Moving Average (EMA)</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="emaAlpha">EMA Alpha (0-1, Optional)</Label>
                  <Input
                    id="emaAlpha"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={formData.emaAlpha ?? ''}
                    onChange={(e) => handleFieldChange('emaAlpha', e.target.value === '' ? null : parseFloat(e.target.value))}
                    placeholder="No EMA calculation (e.g., 0.1 for slow, 0.9 for fast)"
                    data-testid="input-ema-alpha"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Lower values (0.1) create slower-changing averages, higher values (0.9) respond quickly to changes.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => handleDialogClose(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.equipmentId || !formData.sensorType || createConfigMutation.isPending || updateConfigMutation.isPending}
              data-testid="button-save"
            >
              <Save className="h-4 w-4 mr-2" />
              {editingConfig ? 'Update' : 'Create'} Configuration
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}