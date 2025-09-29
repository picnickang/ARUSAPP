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

  const getStatusBadge = (vessel: Vessel) => {
    const isOnline = vessel.onlineStatus === 'online';
    const lastHeartbeat = vessel.lastHeartbeat ? new Date(vessel.lastHeartbeat) : null;
    const isRecent = lastHeartbeat && (Date.now() - lastHeartbeat.getTime()) < 5 * 60 * 1000; // 5 minutes

    if (isOnline && isRecent) {
      return <Badge variant="default" className="bg-green-500"><Wifi className="w-3 h-3 mr-1" />Online</Badge>;
    } else if (vessel.onlineStatus === 'unknown') {
      return <Badge variant="outline"><AlertTriangle className="w-3 h-3 mr-1" />Unknown</Badge>;
    } else {
      return <Badge variant="secondary" className="bg-red-500 text-white"><WifiOff className="w-3 h-3 mr-1" />Offline</Badge>;
    }
  };

  const getConditionBadge = (condition: string) => {
    const colors = {
      excellent: "bg-green-500",
      good: "bg-blue-500", 
      fair: "bg-yellow-500",
      poor: "bg-orange-500",
      critical: "bg-red-500"
    };
    return <Badge className={colors[condition as keyof typeof colors] || "bg-gray-500"}>{condition}</Badge>;
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
                    {vessel.condition ? getConditionBadge(vessel.condition) : <Badge variant="secondary">Unknown</Badge>}
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
                    {selectedVessel.condition ? getConditionBadge(selectedVessel.condition) : <Badge variant="secondary">Unknown</Badge>}
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