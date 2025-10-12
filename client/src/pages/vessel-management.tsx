import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useCreateMutation, useUpdateMutation, useDeleteMutation, useCustomMutation } from "@/hooks/useCrudMutations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ResponsiveTable } from "@/components/shared/ResponsiveTable";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertVesselSchema, Vessel, InsertVessel, Equipment } from "@shared/schema";
import { Plus, Pencil, Trash2, Ship, AlertTriangle, CheckCircle, Eye, Server, Wifi, WifiOff, RefreshCw, Download, Upload } from "lucide-react";
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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [importFileInput, setImportFileInput] = useState<HTMLInputElement | null>(null);
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

  // Standard CRUD mutations using reusable hooks
  const createVesselMutation = useCreateMutation<InsertVessel>('/api/vessels', {
    successMessage: "Vessel created successfully",
    onSuccess: () => setIsCreateDialogOpen(false),
  });

  const updateVesselMutation = useUpdateMutation<InsertVessel>('/api/vessels', {
    successMessage: "Vessel updated successfully",
    onSuccess: () => {
      setIsEditDialogOpen(false);
      setSelectedVessel(null);
    },
  });

  const deleteVesselMutation = useDeleteMutation('/api/vessels', {
    successMessage: "Vessel deleted successfully",
    invalidateQueries: ['/api/vessels', '/api/equipment', '/api/work-orders', '/api/crew'],
    onSuccess: () => {
      setIsDeleteDialogOpen(false);
      setSelectedVessel(null);
    },
  });

  // Custom mutations for non-standard operations
  const exportVesselMutation = useCustomMutation<string, any>({
    mutationFn: (id: string) => apiRequest("GET", `/api/vessels/${id}/export`, undefined, { "x-org-id": "default-org-id" }),
    invalidateKeys: [],
    onSuccess: (data: any, vesselId: string) => {
      // Create a blob and download the file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vessel-${vesselId}-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    successMessage: "Vessel exported successfully",
  });

  const importVesselMutation = useCustomMutation<any, any>({
    mutationFn: (data: any) => apiRequest("POST", `/api/vessels/import`, data, { "x-org-id": "default-org-id" }),
    invalidateKeys: ['/api/vessels', '/api/equipment', '/api/crew'],
    onSuccess: (result: any) => {
      return `Imported ${result.equipmentCount} equipment and ${result.crewCount} crew members`;
    },
    successMessage: "Vessel imported successfully",
  });

  const resetDowntimeMutation = useCustomMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/vessels/${id}/reset-downtime`, {}),
    invalidateKeys: ['/api/vessels'],
    successMessage: "Downtime counter reset successfully",
  });

  const resetOperationMutation = useCustomMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/vessels/${id}/reset-operation`, {}),
    invalidateKeys: ['/api/vessels'],
    successMessage: "Operation counter reset successfully",
  });

  const wipeVesselDataMutation = useCustomMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/vessels/${id}/wipe-data`, {}),
    invalidateKeys: [
      '/api/vessels',
      '/api/telemetry',
      '/api/equipment/health',
      '/api/dashboard',
      '/api/insights',
      '/api/fleet',
      '/api/dtc'
    ],
    onSuccess: (data: any) => `Deleted ${data.deletedRecords} records`,
    successMessage: "Vessel data wiped successfully",
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
      dayRateSgd: vessel.dayRateSgd || "",
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
    setSelectedVessel(vessel);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedVessel) {
      deleteVesselMutation.mutate(selectedVessel.id);
    }
  };

  const handleExport = (vessel: Vessel) => {
    exportVesselMutation.mutate(vessel.id);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        try {
          const text = await file.text();
          const data = JSON.parse(text);
          importVesselMutation.mutate(data);
        } catch (error) {
          toast({
            title: "Invalid file",
            description: "Please select a valid vessel export JSON file",
            variant: "destructive"
          });
        }
      }
    };
    input.click();
  };

  const handleRefresh = (vessel: Vessel) => {
    // Invalidate all queries related to this specific vessel
    queryClient.invalidateQueries({ queryKey: ["/api/vessels"] });
    queryClient.invalidateQueries({ queryKey: ["/api/vessels", vessel.id, "equipment"] });
    queryClient.invalidateQueries({ queryKey: ["/api/equipment/health"] });
    queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
    toast({ 
      title: "Data refreshed", 
      description: `Updated data for ${vessel.name}` 
    });
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
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="gap-2" 
            onClick={handleImport}
            disabled={importVesselMutation.isPending}
            data-testid="button-import-vessel"
          >
            <Upload className="h-4 w-4" />
            Import Vessel
          </Button>
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
                  <FormField
                    control={form.control}
                    name="dayRateSgd"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Day Rate (SGD)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="10000.00" 
                            {...field} 
                            data-testid="input-day-rate" 
                          />
                        </FormControl>
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
        <CardContent className="p-0">
          <ResponsiveTable
            columns={[
              {
                header: "Vessel Name",
                accessor: (vessel: Vessel) => (
                  <Link 
                    href={`/vessels/${vessel.id}`} 
                    className="hover:underline text-primary font-medium"
                    data-testid={`text-vessel-name-${vessel.id}`}
                  >
                    {vessel.name}
                  </Link>
                )
              },
              {
                header: "Class",
                accessor: (vessel: Vessel) => (
                  <span data-testid={`text-vessel-class-${vessel.id}`}>
                    {vessel.vesselClass ? formatVesselClass(vessel.vesselClass) : "Not specified"}
                  </span>
                )
              },
              {
                header: "Condition",
                accessor: (vessel: Vessel) => (
                  <span data-testid={`badge-vessel-condition-${vessel.id}`}>
                    {getConditionBadge(vessel)}
                  </span>
                )
              },
              {
                header: "Status",
                accessor: (vessel: Vessel) => (
                  <span data-testid={`badge-vessel-status-${vessel.id}`}>
                    {getStatusBadge(vessel)}
                  </span>
                )
              },
              {
                header: "Last Heartbeat",
                accessor: (vessel: Vessel) => vessel.lastHeartbeat ? (
                  <span 
                    title={format(new Date(vessel.lastHeartbeat), 'PPpp')}
                    data-testid={`text-vessel-heartbeat-${vessel.id}`}
                  >
                    {formatDistanceToNow(new Date(vessel.lastHeartbeat), { addSuffix: true })}
                  </span>
                ) : (
                  <span 
                    className="text-muted-foreground"
                    data-testid={`text-vessel-heartbeat-${vessel.id}`}
                  >
                    Never
                  </span>
                )
              }
            ]}
            data={vessels}
            keyExtractor={(vessel: Vessel) => vessel.id}
            actions={(vessel: Vessel) => (
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRefresh(vessel)}
                  data-testid={`button-refresh-vessel-${vessel.id}`}
                  aria-label={`Refresh ${vessel.name} data`}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleView(vessel)}
                  data-testid={`button-view-vessel-${vessel.id}`}
                  aria-label={`View ${vessel.name} details`}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport(vessel)}
                  disabled={exportVesselMutation.isPending}
                  data-testid={`button-export-vessel-${vessel.id}`}
                  aria-label={`Export ${vessel.name} data`}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(vessel)}
                  data-testid={`button-edit-vessel-${vessel.id}`}
                  aria-label={`Edit ${vessel.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(vessel)}
                  data-testid={`button-delete-vessel-${vessel.id}`}
                  aria-label={`Delete ${vessel.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
            emptyMessage="No vessels found. Click 'Add Vessel' to create your first vessel."
          />
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
                <div>
                  <label className="text-sm font-medium">Day Rate</label>
                  <p className="text-sm text-muted-foreground" data-testid="text-day-rate">
                    {selectedVessel.dayRateSgd ? `SGD ${parseFloat(selectedVessel.dayRateSgd).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "Not set"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Downtime Days</label>
                  <p className="text-sm text-muted-foreground" data-testid="text-downtime-days">
                    {parseFloat(selectedVessel.downtimeDays || "0").toFixed(2)} days
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Operation Days</label>
                  <p className="text-sm text-muted-foreground" data-testid="text-operation-days">
                    {parseFloat(selectedVessel.operationDays || "0").toFixed(2)} days
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Utilization</label>
                  <p className="text-sm text-muted-foreground" data-testid="text-utilization">
                    {(() => {
                      const opDays = parseFloat(selectedVessel.operationDays || "0");
                      const downDays = parseFloat(selectedVessel.downtimeDays || "0");
                      const totalDays = opDays + downDays;
                      if (totalDays === 0) return "N/A";
                      const utilization = ((opDays - downDays) / opDays * 100).toFixed(1);
                      return `${utilization}%`;
                    })()}
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
                <FormField
                  control={editForm.control}
                  name="dayRateSgd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Day Rate (SGD)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="10000.00" 
                          {...field} 
                          data-testid="input-edit-day-rate" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {selectedVessel && (
                <div className="border-t pt-4 mt-4 space-y-4">
                  <h3 className="font-semibold text-sm">Operational Counters</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Downtime Days</label>
                      <div className="flex items-center gap-2">
                        <Input 
                          value={parseFloat(selectedVessel.downtimeDays || "0").toFixed(2)} 
                          readOnly 
                          disabled
                          className="bg-muted"
                          data-testid="display-downtime-days"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm("Reset downtime counter to 0? This action cannot be undone.")) {
                              resetDowntimeMutation.mutate(selectedVessel.id);
                            }
                          }}
                          disabled={resetDowntimeMutation.isPending}
                          data-testid="button-reset-downtime"
                        >
                          Reset
                        </Button>
                      </div>
                      {selectedVessel.downtimeResetAt && (
                        <p className="text-xs text-muted-foreground">
                          Last reset: {format(new Date(selectedVessel.downtimeResetAt), 'PP')}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Operation Days</label>
                      <div className="flex items-center gap-2">
                        <Input 
                          value={parseFloat(selectedVessel.operationDays || "0").toFixed(2)} 
                          readOnly 
                          disabled
                          className="bg-muted"
                          data-testid="display-operation-days"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm("Reset operation counter to 0? This action cannot be undone.")) {
                              resetOperationMutation.mutate(selectedVessel.id);
                            }
                          }}
                          disabled={resetOperationMutation.isPending}
                          data-testid="button-reset-operation"
                        >
                          Reset
                        </Button>
                      </div>
                      {selectedVessel.operationResetAt && (
                        <p className="text-xs text-muted-foreground">
                          Last reset: {format(new Date(selectedVessel.operationResetAt), 'PP')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {selectedVessel && (
                <div className="border-t pt-4 mt-4 space-y-4">
                  <h3 className="font-semibold text-sm text-destructive">Data Management</h3>
                  <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 space-y-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Wipe Vessel Data</label>
                      <p className="text-xs text-muted-foreground">
                        Permanently delete all telemetry, analytics, and AI predictions for this vessel. 
                        The vessel itself and its equipment remain intact.
                      </p>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          const confirmMessage = `⚠️ CRITICAL WARNING: You are about to permanently delete ALL data for vessel "${selectedVessel.name}":

• All equipment telemetry readings
• All raw sensor data
• All PdM scores and predictions
• All anomaly detections
• All failure predictions
• All digital twin simulations
• All condition monitoring data
• All oil analysis results
• All wear particle analysis

The vessel and equipment records will remain, but all historical data will be lost.

This action CANNOT be undone!

Type "DELETE" to confirm this destructive action.`;
                          
                          const userInput = prompt(confirmMessage);
                          if (userInput === "DELETE") {
                            wipeVesselDataMutation.mutate(selectedVessel.id);
                          } else if (userInput !== null) {
                            toast({ 
                              title: "Action cancelled", 
                              description: "You must type DELETE to confirm",
                              variant: "destructive"
                            });
                          }
                        }}
                        disabled={wipeVesselDataMutation.isPending}
                        data-testid="button-wipe-vessel-data"
                      >
                        {wipeVesselDataMutation.isPending ? "Wiping..." : "Wipe All Vessel Data"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
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

      {/* Delete Vessel Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Vessel
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedVessel?.name}"?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border p-4 bg-muted/50">
              <p className="text-sm font-medium mb-2">What will be deleted:</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Vessel record and configuration</li>
                <li>All associated equipment and sensors</li>
                <li>All telemetry, work orders, and maintenance data</li>
                <li>Port calls, drydock windows, and schedules</li>
              </ul>
            </div>
            <div className="rounded-lg border border-blue-500/50 bg-blue-500/10 p-3">
              <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                ℹ️ Crew will be unassigned
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Crew members will not be deleted. They will be unassigned from this vessel and available for reassignment.
              </p>
            </div>
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive font-medium">
                ⚠️ This action cannot be undone
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                All equipment and related data will be permanently deleted.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setSelectedVessel(null);
              }}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteVesselMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteVesselMutation.isPending ? "Deleting..." : "Delete Vessel"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}