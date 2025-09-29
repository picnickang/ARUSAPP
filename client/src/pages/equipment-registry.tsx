import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertEquipmentSchema, Equipment, InsertEquipment, Vessel, SensorConfiguration, insertSensorConfigSchema } from "@shared/schema";
import { useState } from "react";
import { Plus, Pencil, Trash2, Server, AlertTriangle, CheckCircle, Eye, Ship, Link, Unlink, Settings, Zap } from "lucide-react";
import { format } from "date-fns";

const equipmentTypes = [
  "engine",
  "pump",
  "compressor", 
  "generator",
  "gearbox",
  "thruster",
  "crane",
  "winch",
  "boiler",
  "hvac",
  "navigation",
  "communication",
  "safety",
  "other"
];

const locations = [
  "engine_room",
  "deck",
  "bridge",
  "cargo_hold",
  "pump_room",
  "steering_gear",
  "accommodation",
  "galley",
  "workshop",
  "other"
];

export default function EquipmentRegistry() {
  const { toast } = useToast();
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isAssignVesselDialogOpen, setIsAssignVesselDialogOpen] = useState(false);
  const [selectedVesselId, setSelectedVesselId] = useState<string>("");
  const [isSensorDialogOpen, setIsSensorDialogOpen] = useState(false);
  const [editingSensor, setEditingSensor] = useState<SensorConfiguration | null>(null);

  const { data: equipment = [], isLoading } = useQuery({
    queryKey: ["/api/equipment"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch vessels for assignment dropdown
  const { data: vessels = [] } = useQuery<Vessel[]>({
    queryKey: ["/api/vessels"],
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch sensor configurations for selected equipment when viewing
  const { data: sensorConfigs = [] } = useQuery<SensorConfiguration[]>({
    queryKey: ["/api/sensor-config", selectedEquipment?.id],
    queryFn: () => apiRequest("GET", `/api/sensor-config?equipmentId=${selectedEquipment?.id}`),
    enabled: !!selectedEquipment?.id && isViewDialogOpen,
  });

  const createEquipmentMutation = useMutation({
    mutationFn: (data: InsertEquipment) => 
      apiRequest("POST", "/api/equipment", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      toast({ title: "Equipment created successfully" });
      setIsCreateDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create equipment", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateEquipmentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertEquipment> }) =>
      apiRequest("PUT", `/api/equipment/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      toast({ title: "Equipment updated successfully" });
      setIsEditDialogOpen(false);
      setSelectedEquipment(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update equipment", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteEquipmentMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/equipment/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      toast({ title: "Equipment deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete equipment", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Vessel assignment mutations
  const assignVesselMutation = useMutation({
    mutationFn: ({ equipmentId, vesselId }: { equipmentId: string, vesselId: string }) =>
      apiRequest("POST", `/api/vessels/${vesselId}/equipment/${equipmentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vessels"] });
      toast({ title: "Equipment assigned to vessel successfully" });
      setIsAssignVesselDialogOpen(false);
      setSelectedEquipment(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to assign equipment", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const unassignVesselMutation = useMutation({
    mutationFn: (equipmentId: string) =>
      apiRequest("DELETE", `/api/equipment/${equipmentId}/disassociate-vessel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vessels"] });
      toast({ title: "Equipment unassigned from vessel successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to unassign equipment", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Sensor configuration mutations
  const createSensorMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/sensor-configs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sensor-config", selectedEquipment?.id] });
      setIsSensorDialogOpen(false);
      setEditingSensor(null);
      sensorForm.reset();
      toast({ title: "Sensor configuration created successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create sensor configuration", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateSensorMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest("PUT", `/api/sensor-configs/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sensor-config", selectedEquipment?.id] });
      setIsSensorDialogOpen(false);
      setEditingSensor(null);
      sensorForm.reset();
      toast({ title: "Sensor configuration updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update sensor configuration", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteSensorMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/sensor-configs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sensor-config", selectedEquipment?.id] });
      toast({ title: "Sensor configuration deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete sensor configuration", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const form = useForm<InsertEquipment>({
    resolver: zodResolver(insertEquipmentSchema),
    defaultValues: {
      orgId: "default-org-id",
      name: "",
      type: "",
      manufacturer: "",
      model: "",
      serialNumber: "",
      location: "",
      vesselName: "",
      isActive: true,
      specifications: null,
      operatingParameters: null,
      maintenanceSchedule: null,
    },
  });

  const editForm = useForm<Partial<InsertEquipment>>({
    resolver: zodResolver(insertEquipmentSchema.partial()),
  });

  // Sensor configuration form
  const sensorForm = useForm({
    resolver: zodResolver(insertSensorConfigSchema),
    defaultValues: {
      equipmentId: "",
      sensorType: "",
      enabled: true,
      sampleRateHz: 1.0,
      gain: 1.0,
      offset: 0.0,
      deadband: 0.0,
      minValid: null,
      maxValid: null,
      warnLo: null,
      warnHi: null,
      critLo: null,
      critHi: null,
      hysteresis: 0.0,
      emaAlpha: 0.1,
      targetUnit: "",
      notes: "",
    },
  });

  function onSubmit(data: InsertEquipment) {
    createEquipmentMutation.mutate(data);
  }

  function onEditSubmit(data: Partial<InsertEquipment>) {
    if (selectedEquipment) {
      updateEquipmentMutation.mutate({ id: selectedEquipment.id, data });
    }
  }

  function handleEdit(equipment: Equipment) {
    setSelectedEquipment(equipment);
    editForm.reset({
      name: equipment.name,
      type: equipment.type,
      manufacturer: equipment.manufacturer || "",
      model: equipment.model || "",
      serialNumber: equipment.serialNumber || "",
      location: equipment.location || "",
      vesselName: equipment.vesselName || "",
      isActive: equipment.isActive,
    });
    setIsEditDialogOpen(true);
  }

  function handleView(equipment: Equipment) {
    setSelectedEquipment(equipment);
    setIsViewDialogOpen(true);
  }

  function handleDelete(equipment: Equipment) {
    if (confirm(`Are you sure you want to delete equipment "${equipment.name}"?`)) {
      deleteEquipmentMutation.mutate(equipment.id);
    }
  }

  function handleAssignVessel(equipment: Equipment) {
    setSelectedEquipment(equipment);
    setSelectedVesselId("");
    setIsAssignVesselDialogOpen(true);
  }

  function handleUnassignVessel(equipment: Equipment) {
    if (confirm(`Are you sure you want to unassign "${equipment.name}" from its vessel?`)) {
      unassignVesselMutation.mutate(equipment.id);
    }
  }

  function onVesselAssignSubmit() {
    if (selectedEquipment && selectedVesselId) {
      assignVesselMutation.mutate({
        equipmentId: selectedEquipment.id,
        vesselId: selectedVesselId
      });
    }
  }

  // Sensor management handlers
  function handleAddSensor() {
    if (!selectedEquipment) return;
    setEditingSensor(null);
    sensorForm.reset({
      equipmentId: selectedEquipment.id,
      sensorType: "",
      enabled: true,
      sampleRateHz: 1.0,
      gain: 1.0,
      offset: 0.0,
      deadband: 0.0,
      minValid: null,
      maxValid: null,
      warnLo: null,
      warnHi: null,
      critLo: null,
      critHi: null,
      hysteresis: 0.0,
      emaAlpha: 0.1,
      targetUnit: "",
      notes: "",
    });
    setIsSensorDialogOpen(true);
  }

  function handleEditSensor(sensor: SensorConfiguration) {
    setEditingSensor(sensor);
    sensorForm.reset({
      equipmentId: sensor.equipmentId,
      sensorType: sensor.sensorType,
      enabled: sensor.enabled,
      sampleRateHz: sensor.sampleRateHz || 1.0,
      gain: sensor.gain,
      offset: sensor.offset,
      deadband: sensor.deadband,
      minValid: sensor.minValid,
      maxValid: sensor.maxValid,
      warnLo: sensor.warnLo,
      warnHi: sensor.warnHi,
      critLo: sensor.critLo,
      critHi: sensor.critHi,
      hysteresis: sensor.hysteresis,
      emaAlpha: sensor.emaAlpha,
      targetUnit: sensor.targetUnit || "",
      notes: sensor.notes || "",
    });
    setIsSensorDialogOpen(true);
  }

  function handleDeleteSensor(sensor: SensorConfiguration) {
    if (confirm(`Are you sure you want to delete the ${sensor.sensorType} sensor configuration?`)) {
      deleteSensorMutation.mutate(sensor.id);
    }
  }

  function onSensorSubmit(data: any) {
    if (editingSensor) {
      updateSensorMutation.mutate({ id: editingSensor.id, data });
    } else {
      createSensorMutation.mutate(data);
    }
  }

  function getVesselInfo(equipment: Equipment) {
    if (equipment.vesselId) {
      const vessel = vessels.find(v => v.id === equipment.vesselId);
      return vessel ? { name: vessel.name, id: vessel.id, isLinked: true } : { name: equipment.vesselName || "Unknown", id: null, isLinked: false };
    } else if (equipment.vesselName) {
      return { name: equipment.vesselName, id: null, isLinked: false };
    }
    return { name: null, id: null, isLinked: false };
  }

  function getStatusBadge(equipment: Equipment) {
    if (!equipment.isActive) {
      return <Badge variant="destructive" data-testid={`status-inactive-${equipment.id}`}>Inactive</Badge>;
    }
    return <Badge variant="default" data-testid={`status-active-${equipment.id}`}>Active</Badge>;
  }

  function formatLocation(location: string) {
    return location.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  function formatType(type: string) {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  function renderVesselCell(equipment: Equipment) {
    const vesselInfo = getVesselInfo(equipment);
    
    if (!vesselInfo.name) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">-</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleAssignVessel(equipment)}
            data-testid={`button-assign-vessel-${equipment.id}`}
            title="Assign to vessel"
          >
            <Link className="h-3 w-3" />
          </Button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Ship className="h-3 w-3 text-muted-foreground" />
          <span className={vesselInfo.isLinked ? "" : "text-muted-foreground italic"}>
            {vesselInfo.name}
          </span>
          {!vesselInfo.isLinked && (
            <span className="text-xs text-orange-500" title="Legacy vessel name - not linked to vessel record">
              (legacy)
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {!equipment.vesselId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAssignVessel(equipment)}
              data-testid={`button-assign-vessel-${equipment.id}`}
              title="Assign to vessel"
            >
              <Link className="h-3 w-3" />
            </Button>
          )}
          {equipment.vesselId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleUnassignVessel(equipment)}
              data-testid={`button-unassign-vessel-${equipment.id}`}
              title="Unassign from vessel"
            >
              <Unlink className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="page-title">Equipment Registry</h1>
          <p className="text-muted-foreground" data-testid="page-description">
            Manage your vessel equipment catalog and configurations
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2" data-testid="button-add-equipment">
              <Plus className="h-4 w-4" />
              Add Equipment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Equipment</DialogTitle>
              <DialogDescription>
                Register new equipment in your fleet inventory
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="form-create-equipment">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Equipment Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Main Engine #1" {...field} data-testid="input-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} data-testid="select-type">
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select equipment type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {equipmentTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {formatType(type)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="manufacturer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Manufacturer</FormLabel>
                        <FormControl>
                          <Input placeholder="Caterpillar" {...field} data-testid="input-manufacturer" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Model</FormLabel>
                        <FormControl>
                          <Input placeholder="3516C" {...field} data-testid="input-model" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="serialNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Serial Number</FormLabel>
                        <FormControl>
                          <Input placeholder="ABC123456" {...field} data-testid="input-serial" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="vesselName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vessel Name</FormLabel>
                        <FormControl>
                          <Input placeholder="MV Ocean Explorer" {...field} data-testid="input-vessel" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} data-testid="select-location">
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {locations.map((location) => (
                            <SelectItem key={location} value={location}>
                              {formatLocation(location)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Active Equipment
                        </FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Equipment is currently in service
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                    data-testid="button-cancel-create"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createEquipmentMutation.isPending}
                    data-testid="button-submit-create"
                  >
                    {createEquipmentMutation.isPending ? "Creating..." : "Create Equipment"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Equipment Inventory ({equipment.length})
          </CardTitle>
          <CardDescription>
            Complete catalog of registered equipment across your fleet
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8" data-testid="loading-equipment">
              <div className="text-muted-foreground">Loading equipment...</div>
            </div>
          ) : equipment.length === 0 ? (
            <div className="text-center py-8" data-testid="empty-equipment">
              <Server className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Equipment Registered</h3>
              <p className="text-muted-foreground mb-4">
                Start by adding equipment to your fleet inventory
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-add-first-equipment">
                <Plus className="h-4 w-4 mr-2" />
                Add First Equipment
              </Button>
            </div>
          ) : (
            <Table data-testid="table-equipment">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Manufacturer</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Vessel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipment.map((item: Equipment) => (
                  <TableRow key={item.id} data-testid={`row-equipment-${item.id}`}>
                    <TableCell className="font-medium" data-testid={`text-name-${item.id}`}>
                      {item.name}
                    </TableCell>
                    <TableCell data-testid={`text-type-${item.id}`}>
                      {formatType(item.type)}
                    </TableCell>
                    <TableCell data-testid={`text-manufacturer-${item.id}`}>
                      {item.manufacturer || "-"}
                    </TableCell>
                    <TableCell data-testid={`text-model-${item.id}`}>
                      {item.model || "-"}
                    </TableCell>
                    <TableCell data-testid={`text-location-${item.id}`}>
                      {item.location ? formatLocation(item.location) : "-"}
                    </TableCell>
                    <TableCell data-testid={`text-vessel-${item.id}`}>
                      {renderVesselCell(item)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(item)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(item)}
                          data-testid={`button-view-${item.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(item)}
                          data-testid={`button-edit-${item.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item)}
                          data-testid={`button-delete-${item.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Equipment</DialogTitle>
            <DialogDescription>
              Update equipment information
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4" data-testid="form-edit-equipment">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Equipment Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Main Engine #1" {...field} data-testid="input-edit-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} data-testid="select-edit-type">
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select equipment type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {equipmentTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {formatType(type)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="manufacturer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manufacturer</FormLabel>
                      <FormControl>
                        <Input placeholder="Caterpillar" {...field} data-testid="input-edit-manufacturer" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model</FormLabel>
                      <FormControl>
                        <Input placeholder="3516C" {...field} data-testid="input-edit-model" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="serialNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serial Number</FormLabel>
                      <FormControl>
                        <Input placeholder="ABC123456" {...field} data-testid="input-edit-serial" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="vesselName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vessel Name</FormLabel>
                      <FormControl>
                        <Input placeholder="MV Ocean Explorer" {...field} data-testid="input-edit-vessel" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} data-testid="select-edit-location">
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {locations.map((location) => (
                          <SelectItem key={location} value={location}>
                            {formatLocation(location)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Active Equipment
                      </FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Equipment is currently in service
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-edit-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateEquipmentMutation.isPending}
                  data-testid="button-submit-edit"
                >
                  {updateEquipmentMutation.isPending ? "Updating..." : "Update Equipment"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Equipment Details</DialogTitle>
            <DialogDescription>
              Detailed information for {selectedEquipment?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedEquipment && (
            <div className="space-y-4" data-testid="equipment-details">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="text-sm" data-testid="detail-name">{selectedEquipment.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Type</label>
                  <p className="text-sm" data-testid="detail-type">{formatType(selectedEquipment.type)}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Manufacturer</label>
                  <p className="text-sm" data-testid="detail-manufacturer">{selectedEquipment.manufacturer || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Model</label>
                  <p className="text-sm" data-testid="detail-model">{selectedEquipment.model || "-"}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Serial Number</label>
                  <p className="text-sm" data-testid="detail-serial">{selectedEquipment.serialNumber || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Vessel Assignment</label>
                  <div className="mt-1">
                    {(() => {
                      const vesselInfo = getVesselInfo(selectedEquipment);
                      if (!vesselInfo.name) {
                        return <p className="text-sm text-muted-foreground">Not assigned to any vessel</p>;
                      }
                      return (
                        <div className="flex items-center gap-2">
                          <Ship className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{vesselInfo.name}</span>
                          {!vesselInfo.isLinked && (
                            <span className="text-xs text-orange-500" title="Legacy vessel name - not linked to vessel record">
                              (legacy)
                            </span>
                          )}
                        </div>
                      );
                    })()} 
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Location</label>
                  <p className="text-sm" data-testid="detail-location">{selectedEquipment.location ? formatLocation(selectedEquipment.location) : "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">
                    {getStatusBadge(selectedEquipment)}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created</label>
                  <p className="text-sm" data-testid="detail-created">{format(selectedEquipment.createdAt, "PPP")}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                  <p className="text-sm" data-testid="detail-updated">{format(selectedEquipment.updatedAt, "PPP")}</p>
                </div>
              </div>
              
              {/* Sensor Configurations */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Sensor Configurations
                  </h3>
                  <Button
                    size="sm"
                    onClick={handleAddSensor}
                    data-testid="button-add-sensor"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Sensor
                  </Button>
                </div>
                {sensorConfigs.length > 0 ? (
                  <div className="space-y-2">
                    {sensorConfigs.map((config: SensorConfiguration) => (
                      <div key={config.id} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-3">
                          <Badge variant={config.enabled ? "default" : "secondary"}>
                            {config.sensorType}
                          </Badge>
                          <div className="text-sm">
                            <span className="text-muted-foreground">
                              {config.enabled ? "Enabled" : "Disabled"}
                            </span>
                            {config.targetUnit && (
                              <span className="text-muted-foreground ml-2">• {config.targetUnit}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-xs text-muted-foreground">
                            Gain: {config.gain} | Offset: {config.offset}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditSensor(config)}
                            data-testid={`button-edit-sensor-${config.id}`}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSensor(config)}
                            data-testid={`button-delete-sensor-${config.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Zap className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground text-sm mb-2">No sensor configurations found</p>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={handleAddSensor}
                      data-testid="button-add-first-sensor"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Sensor
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end">
                <Button onClick={() => setIsViewDialogOpen(false)} data-testid="button-close-view">
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Vessel Assignment Dialog */}
      <Dialog open={isAssignVesselDialogOpen} onOpenChange={setIsAssignVesselDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ship className="h-5 w-5" />
              Assign Equipment to Vessel
            </DialogTitle>
            <DialogDescription>
              Assign "{selectedEquipment?.name}" to a vessel
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="vessel-select">Select Vessel</Label>
              <Select value={selectedVesselId} onValueChange={setSelectedVesselId}>
                <SelectTrigger data-testid="select-vessel-assignment">
                  <SelectValue placeholder="Choose a vessel" />
                </SelectTrigger>
                <SelectContent>
                  {vessels.map((vessel) => (
                    <SelectItem key={vessel.id} value={vessel.id}>
                      <div className="flex items-center gap-2">
                        <Ship className="h-4 w-4" />
                        {vessel.name}
                        {vessel.vesselClass && (
                          <span className="text-muted-foreground text-sm">
                            ({vessel.vesselClass.replace(/_/g, ' ')})
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsAssignVesselDialogOpen(false)}
                data-testid="button-cancel-assign"
              >
                Cancel
              </Button>
              <Button 
                onClick={onVesselAssignSubmit}
                disabled={!selectedVesselId || assignVesselMutation.isPending}
                data-testid="button-confirm-assign"
              >
                {assignVesselMutation.isPending ? "Assigning..." : "Assign"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sensor Configuration Dialog */}
      <Dialog open={isSensorDialogOpen} onOpenChange={setIsSensorDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              {editingSensor ? "Edit Sensor Configuration" : "Add Sensor Configuration"}
            </DialogTitle>
            <DialogDescription>
              {editingSensor 
                ? `Edit configuration for ${editingSensor.sensorType} sensor`
                : `Add a new sensor configuration for "${selectedEquipment?.name}"`
              }
            </DialogDescription>
          </DialogHeader>
          <Form {...sensorForm}>
            <form onSubmit={sensorForm.handleSubmit(onSensorSubmit)} className="space-y-4" data-testid="form-sensor-config">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={sensorForm.control}
                  name="sensorType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sensor Type *</FormLabel>
                      <FormControl>
                        <Input placeholder="temperature, pressure, rpm" {...field} data-testid="input-sensor-type" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={sensorForm.control}
                  name="targetUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Unit</FormLabel>
                      <FormControl>
                        <Input placeholder="°C, PSI, RPM" {...field} data-testid="input-target-unit" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={sensorForm.control}
                  name="gain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gain</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1" 
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-gain" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={sensorForm.control}
                  name="offset"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Offset</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1" 
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-offset" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={sensorForm.control}
                  name="sampleRateHz"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sample Rate (Hz)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1" 
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 1)}
                          data-testid="input-sample-rate" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={sensorForm.control}
                  name="minValid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min Valid Value</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1" 
                          {...field} 
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                          data-testid="input-min-valid" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={sensorForm.control}
                  name="maxValid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Valid Value</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1" 
                          {...field} 
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                          data-testid="input-max-valid" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-4 gap-4">
                <FormField
                  control={sensorForm.control}
                  name="warnLo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Warning Low</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1" 
                          {...field} 
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                          data-testid="input-warn-lo" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={sensorForm.control}
                  name="warnHi"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Warning High</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1" 
                          {...field} 
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                          data-testid="input-warn-hi" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={sensorForm.control}
                  name="critLo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Critical Low</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1" 
                          {...field} 
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                          data-testid="input-crit-lo" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={sensorForm.control}
                  name="critHi"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Critical High</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1" 
                          {...field} 
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                          data-testid="input-crit-hi" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={sensorForm.control}
                  name="deadband"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deadband</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1" 
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-deadband" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={sensorForm.control}
                  name="hysteresis"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hysteresis</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1" 
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-hysteresis" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={sensorForm.control}
                  name="emaAlpha"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>EMA Alpha (0-1)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          min="0" 
                          max="1" 
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-ema-alpha" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={sensorForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Additional configuration notes..." 
                        {...field} 
                        data-testid="input-notes" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={sensorForm.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Enable Sensor
                      </FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Sensor is active and collecting data
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-enabled"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsSensorDialogOpen(false)}
                  data-testid="button-cancel-sensor"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createSensorMutation.isPending || updateSensorMutation.isPending}
                  data-testid="button-submit-sensor"
                >
                  {(createSensorMutation.isPending || updateSensorMutation.isPending) 
                    ? "Saving..." 
                    : editingSensor ? "Update Sensor" : "Create Sensor"
                  }
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}