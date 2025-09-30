import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertVesselSchema, Vessel, InsertVessel, Equipment } from "@shared/schema";
import { Plus, Pencil, Trash2, Ship, AlertTriangle, CheckCircle, Eye, Server, Wifi, WifiOff } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

const vesselClasses = [
  "cargo",
  "tanker", 
  "container",
  "bulk_carrier",
  "passenger",
  "ro_ro",
  "fishing",
  "offshore",
  "naval",
  "yacht",
  "other"
];

const vesselConditions = [
  "excellent",
  "good",
  "fair", 
  "poor",
  "critical"
];

export default function VesselManagement() {
  const { toast } = useToast();
  const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedVesselEquipment, setSelectedVesselEquipment] = useState<Equipment[]>([]);

  const { data: vessels = [], isLoading } = useQuery({
    queryKey: ["/api/vessels"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch work orders for downtime status calculation
  const { data: workOrders = [] } = useQuery({
    queryKey: ["/api/work-orders"],
    refetchInterval: 30000,
  });

  // Fetch equipment health for condition calculation
  const { data: equipmentHealth = [] } = useQuery({
    queryKey: ["/api/equipment/health"],
    refetchInterval: 30000,
  });

  // Fetch equipment data for vessel-work order association
  const { data: equipment = [] } = useQuery({
    queryKey: ["/api/equipment"],
    queryFn: () => apiRequest("GET", "/api/equipment", undefined, {
      "x-org-id": "default-org-id"
    }),
    refetchInterval: 30000,
  });

  const createVesselMutation = useMutation({
    mutationFn: (data: InsertVessel) => 
      apiRequest("POST", "/api/vessels", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vessels"] });
      toast({ title: "Vessel created successfully" });
      setIsCreateDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create vessel", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateVesselMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertVessel> }) =>
      apiRequest("PUT", `/api/vessels/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vessels"] });
      toast({ title: "Vessel updated successfully" });
      setIsEditDialogOpen(false);
      setSelectedVessel(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update vessel", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteVesselMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/vessels/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vessels"] });
      toast({ title: "Vessel deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete vessel", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const form = useForm<InsertVessel>({
    resolver: zodResolver(insertVesselSchema),
    defaultValues: {
      orgId: "default-org-id",
      name: "",
      vesselClass: "",
      condition: "good",
      onlineStatus: "offline",
      specifications: null,
      operatingParameters: null,
    },
  });

  const editForm = useForm<InsertVessel>({
    resolver: zodResolver(insertVesselSchema),
    defaultValues: {
      orgId: "default-org-id",
      name: "",
      vesselClass: "",
      condition: "good",
      onlineStatus: "offline",
      specifications: null,
      operatingParameters: null,
    },
  });

  // Fetch equipment for selected vessel when viewing
  const { data: vesselEquipment } = useQuery({
    queryKey: ["/api/vessels", selectedVessel?.id, "equipment"],
    queryFn: () => apiRequest("GET", `/api/vessels/${selectedVessel?.id}/equipment`),
    enabled: !!selectedVessel?.id && isViewDialogOpen,
  });

  const handleCreate = (data: InsertVessel) => {
    createVesselMutation.mutate(data);
  };

  const handleEdit = (vessel: Vessel) => {
    setSelectedVessel(vessel);
    editForm.reset({
      orgId: vessel.orgId,
      name: vessel.name,
      vesselClass: vessel.vesselClass || "",
      condition: vessel.condition || "good",
      onlineStatus: vessel.onlineStatus || "offline",
      specifications: vessel.specifications,
      operatingParameters: vessel.operatingParameters,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = (data: InsertVessel) => {
    if (selectedVessel) {
      updateVesselMutation.mutate({ id: selectedVessel.id, data });
    }
  };

  const handleView = (vessel: Vessel) => {
    setSelectedVessel(vessel);
    setIsViewDialogOpen(true);
  };

  const handleDelete = (vessel: Vessel) => {
    if (confirm(`Are you sure you want to delete vessel "${vessel.name}"? This action cannot be undone.`)) {
      deleteVesselMutation.mutate(vessel.id);
    }
  };

  // Helper function to get equipment associated with a vessel
  const getVesselEquipment = (vesselName: string) => {
    return equipmentHealth.filter(eq => eq.vessel === vesselName);
  };

  // Helper function to check if vessel has active work orders with downtime
  const hasActiveDowntime = (vesselName: string, vesselId: string) => {
    return workOrders.some(wo => {
      // Find the equipment associated with this work order
      const workOrderEquipment = equipment.find(eq => eq.id === wo.equipmentId);
      if (!workOrderEquipment) return false;
      
      // Check if this equipment belongs to the vessel (by ID or name for backward compatibility)
      const belongsToVessel = workOrderEquipment.vesselId === vesselId || 
                             workOrderEquipment.vesselName === vesselName;
      if (!belongsToVessel) return false;
      
      // Check if work order is active and has downtime
      const isActive = wo.status === 'in_progress' || wo.status === 'open';
      const hasDowntime = (wo.estimatedDowntimeHours && wo.estimatedDowntimeHours > 0) || 
                         (wo.actualDowntimeHours && wo.actualDowntimeHours > 0);
      
      return isActive && hasDowntime;
    });
  };

  const getStatusBadge = (vessel: Vessel) => {
    // Vessel defaults to Online unless there's a work order with downtime > 0
    const isOfflineForMaintenance = hasActiveDowntime(vessel.name, vessel.id);
    
    if (isOfflineForMaintenance) {
      return <Badge variant="secondary" className="bg-red-500 text-white"><WifiOff className="w-3 h-3 mr-1" />Offline</Badge>;
    } else {
      return <Badge variant="default" className="bg-green-500"><Wifi className="w-3 h-3 mr-1" />Online</Badge>;
    }
  };

  const getConditionBadge = (vessel: Vessel) => {
    const vesselEquipment = getVesselEquipment(vessel.name);
    
    if (vesselEquipment.length === 0) {
      // No equipment data available, use vessel's stored condition or default to good
      const condition = vessel.condition || "good";
      const colors = {
        excellent: "bg-green-500",
        good: "bg-blue-500", 
        fair: "bg-yellow-500",
        poor: "bg-orange-500",
        critical: "bg-red-500"
      };
      return <Badge className={colors[condition as keyof typeof colors] || "bg-gray-500"}>{condition}</Badge>;
    }

    // Calculate overall condition based on equipment health and predictive maintenance
    const avgHealthIndex = vesselEquipment.reduce((sum, eq) => sum + eq.healthIndex, 0) / vesselEquipment.length;
    const criticalCount = vesselEquipment.filter(eq => eq.status === 'critical').length;
    const warningCount = vesselEquipment.filter(eq => eq.status === 'warning').length;
    const urgentMaintenanceCount = vesselEquipment.filter(eq => eq.predictedDueDays <= 7).length;

    let condition: string;
    let color: string;

    // Determine condition based on multiple factors
    if (criticalCount > 0 || avgHealthIndex < 50) {
      condition = "critical";
      color = "bg-red-500";
    } else if (warningCount > 0 || avgHealthIndex < 75 || urgentMaintenanceCount > 0) {
      condition = "poor";
      color = "bg-orange-500";
    } else if (avgHealthIndex < 85) {
      condition = "fair";
      color = "bg-yellow-500";
    } else if (avgHealthIndex < 95) {
      condition = "good";
      color = "bg-blue-500";
    } else {
      condition = "excellent";
      color = "bg-green-500";
    }

    return <Badge className={color}>{condition}</Badge>;
  };

  const formatVesselClass = (vesselClass: string) => {
    return vesselClass.replace(/_/g, ' ').split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg">Loading vessels...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-vessel-management">Vessel Management</h1>
          <p className="text-muted-foreground">
            Manage your fleet vessels, monitor status, and view equipment assignments
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-add-vessel">
              <Plus className="h-4 w-4" />
              Add Vessel
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Vessel</DialogTitle>
              <DialogDescription>
                Create a new vessel record for your fleet
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vessel Name</FormLabel>
                        <FormControl>
                          <Input placeholder="MV Atlantic Explorer" {...field} data-testid="input-vessel-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="vesselClass"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vessel Class</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-vessel-class">
                              <SelectValue placeholder="Select class" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {vesselClasses.map((cls) => (
                              <SelectItem key={cls} value={cls}>
                                {formatVesselClass(cls)}
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
                    name="condition"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Condition</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-vessel-condition">
                              <SelectValue placeholder="Select condition" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {vesselConditions.map((condition) => (
                              <SelectItem key={condition} value={condition}>
                                {condition.charAt(0).toUpperCase() + condition.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createVesselMutation.isPending}
                    data-testid="button-create-vessel"
                  >
                    {createVesselMutation.isPending ? "Creating..." : "Create Vessel"}
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
            <Ship className="h-5 w-5" />
            Fleet Overview
          </CardTitle>
          <CardDescription>
            {vessels.length} vessel(s) in your fleet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vessel Name</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Heartbeat</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vessels.map((vessel: Vessel) => (
                <TableRow key={vessel.id} data-testid={`row-vessel-${vessel.id}`}>
                  <TableCell className="font-medium" data-testid={`text-vessel-name-${vessel.id}`}>
                    {vessel.name}
                  </TableCell>
                  <TableCell data-testid={`text-vessel-class-${vessel.id}`}>
                    {vessel.vesselClass ? formatVesselClass(vessel.vesselClass) : "Not specified"}
                  </TableCell>
                  <TableCell data-testid={`badge-vessel-condition-${vessel.id}`}>
                    {getConditionBadge(vessel)}
                  </TableCell>
                  <TableCell data-testid={`badge-vessel-status-${vessel.id}`}>
                    {getStatusBadge(vessel)}
                  </TableCell>
                  <TableCell data-testid={`text-vessel-heartbeat-${vessel.id}`}>
                    {vessel.lastHeartbeat ? (
                      <span title={format(new Date(vessel.lastHeartbeat), 'PPpp')}>
                        {formatDistanceToNow(new Date(vessel.lastHeartbeat), { addSuffix: true })}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Never</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleView(vessel)}
                        data-testid={`button-view-vessel-${vessel.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(vessel)}
                        data-testid={`button-edit-vessel-${vessel.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(vessel)}
                        data-testid={`button-delete-vessel-${vessel.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {vessels.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No vessels found. Click "Add Vessel" to create your first vessel.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Vessel Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ship className="h-5 w-5" />
              {selectedVessel?.name}
            </DialogTitle>
            <DialogDescription>
              Vessel details and equipment assignments
            </DialogDescription>
          </DialogHeader>
          {selectedVessel && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Vessel Class</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedVessel.vesselClass ? formatVesselClass(selectedVessel.vesselClass) : "Not specified"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Condition</label>
                  <div className="mt-1">
                    {getConditionBadge(selectedVessel)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <div className="mt-1">
                    {getStatusBadge(selectedVessel)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Last Heartbeat</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedVessel.lastHeartbeat ? format(new Date(selectedVessel.lastHeartbeat), 'PPpp') : "Never"}
                  </p>
                </div>
              </div>

              {/* Associated Equipment */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  Associated Equipment
                </h3>
                {vesselEquipment && vesselEquipment.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Equipment Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Manufacturer</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vesselEquipment.map((equipment: Equipment) => (
                        <TableRow key={equipment.id}>
                          <TableCell className="font-medium">{equipment.name}</TableCell>
                          <TableCell>{equipment.type}</TableCell>
                          <TableCell>{equipment.manufacturer}</TableCell>
                          <TableCell>{equipment.location}</TableCell>
                          <TableCell>
                            <Badge variant={equipment.isActive ? "default" : "secondary"}>
                              {equipment.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No equipment assigned to this vessel
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Vessel Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Vessel</DialogTitle>
            <DialogDescription>
              Update vessel information
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleUpdate)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vessel Name</FormLabel>
                      <FormControl>
                        <Input placeholder="MV Atlantic Explorer" {...field} data-testid="input-edit-vessel-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="vesselClass"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vessel Class</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-vessel-class">
                            <SelectValue placeholder="Select class" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {vesselClasses.map((cls) => (
                            <SelectItem key={cls} value={cls}>
                              {formatVesselClass(cls)}
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
                  name="condition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Condition</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-vessel-condition">
                            <SelectValue placeholder="Select condition" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {vesselConditions.map((condition) => (
                            <SelectItem key={condition} value={condition}>
                              {condition.charAt(0).toUpperCase() + condition.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end gap-2">
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
                  disabled={updateVesselMutation.isPending}
                  data-testid="button-update-vessel"
                >
                  {updateVesselMutation.isPending ? "Updating..." : "Update Vessel"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}