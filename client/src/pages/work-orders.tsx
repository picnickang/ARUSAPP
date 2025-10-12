import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Plus, Eye, Edit, Trash2, Package, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchWorkOrders } from "@/lib/api";
import { formatDistanceToNow, format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getCurrentOrgId } from "@/hooks/useOrganization";
import { WorkOrder, InsertWorkOrder } from "@shared/schema";
import { MultiPartSelector } from "@/components/MultiPartSelector";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { ResponsiveTable } from "@/components/shared/ResponsiveTable";
import { useCreateMutation, useUpdateMutation, useDeleteMutation, useCustomMutation } from "@/hooks/useCrudMutations";

export default function WorkOrders() {
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<WorkOrder>>({});
  const [createForm, setCreateForm] = useState<Partial<InsertWorkOrder>>({
    equipmentId: '',
    vesselId: '',
    reason: '',
    description: '',
    priority: 2,
    estimatedDowntimeHours: undefined,
    actualDowntimeHours: undefined,
    affectsVesselDowntime: false
  });
  const [selectedVesselIdForCreate, setSelectedVesselIdForCreate] = useState<string>('');
  const [timerTick, setTimerTick] = useState(0); // Forces re-render for live timer
  const [sortColumn, setSortColumn] = useState<string>('created');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const { toast } = useToast();
  
  // Live timer for in-progress work orders - updates every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTimerTick(prev => prev + 1);
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);
  
  const { data: workOrders, isLoading, error } = useQuery({
    queryKey: ["/api/work-orders"],
    queryFn: () => fetchWorkOrders(),
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch vessels for dropdown
  const { data: vessels = [] } = useQuery({
    queryKey: ["/api/vessels"],
    refetchInterval: 60000
  });

  // Fetch equipment for dropdown
  const { data: equipment = [] } = useQuery({
    queryKey: ["/api/equipment"],
    refetchInterval: 60000
  });
  
  // Fetch crew members filtered by selected vessel for create form
  const crewQueryKey = selectedVesselIdForCreate 
    ? `/api/crew?vessel_id=${selectedVesselIdForCreate}`
    : '/api/crew';
  
  const { data: crewMembers = [] } = useQuery({
    queryKey: [crewQueryKey],
    enabled: !!selectedVesselIdForCreate, // Only fetch when vessel is selected
    refetchInterval: 60000
  });
  
  // Filter equipment by selected vessel for create form
  const filteredEquipmentForCreate = selectedVesselIdForCreate
    ? equipment.filter((eq: any) => eq.vesselId === selectedVesselIdForCreate)
    : equipment;

  // Standard CRUD mutations using reusable hooks
  const createMutation = useCreateMutation<InsertWorkOrder>('/api/work-orders', {
    successMessage: "Work order created successfully",
    onSuccess: () => {
      setCreateModalOpen(false);
      setCreateForm({ equipmentId: '', vesselId: '', reason: '', description: '', priority: 2, estimatedDowntimeHours: undefined, actualDowntimeHours: undefined, affectsVesselDowntime: false });
    },
  });

  const updateMutation = useUpdateMutation<Partial<WorkOrder>>('/api/work-orders', {
    successMessage: "Work order updated successfully",
    onSuccess: () => {
      setEditModalOpen(false);
      setSelectedOrder(null);
      setEditForm({});
    },
  });

  const deleteMutation = useDeleteMutation('/api/work-orders', {
    successMessage: "Work order deleted successfully",
  });

  // Custom mutations for non-standard operations
  const clearAllMutation = useCustomMutation({
    mutationFn: () => apiRequest("DELETE", "/api/work-orders/clear"),
    invalidateKeys: ['/api/work-orders'],
    successMessage: "All work orders cleared successfully"
  });

  const completeWorkOrderMutation = useCustomMutation<string>({
    mutationFn: async (orderId: string) => {
      const now = new Date();
      const order = workOrders?.find(wo => wo.id === orderId);
      
      // Calculate actual duration if work order was started
      let actualDuration = null;
      if (order?.actualStartDate) {
        const startDate = new Date(order.actualStartDate);
        actualDuration = Math.round((now.getTime() - startDate.getTime()) / (1000 * 60)); // in minutes
      }
      
      // Fetch parts used in this work order
      const partsUsed = await apiRequest<any[]>("GET", `/api/work-orders/${orderId}/parts`);
      
      // Fetch maintenance costs
      const costs = await apiRequest<any[]>("GET", `/api/work-orders/${orderId}/costs`);
      const totalCostImpact = costs.reduce((sum, cost) => sum + (cost.amount || 0), 0);
      
      // Complete work order (atomic: updates status + creates completion log)
      const estimatedDuration = order?.estimatedDowntimeHours ? order.estimatedDowntimeHours * 60 : null;
      
      await apiRequest("POST", `/api/work-orders/${orderId}/complete`, {
        completedAt: now,
        completedBy: null, // No auth system yet
        actualDurationMinutes: actualDuration,
        estimatedDurationMinutes: estimatedDuration,
        actualDowntimeHours: order?.actualDowntimeHours || 0,
        partsUsed: partsUsed.map(p => ({ partId: p.partId, quantity: p.quantityUsed })),
        totalCost: totalCostImpact,
        equipmentId: order?.equipmentId,
        vesselId: order?.vesselId,
        maintenanceScheduleId: order?.scheduleId || null,
      });
      
      return orderId;
    },
    invalidateKeys: ['/api/work-orders', '/api/work-order-completions'],
    successMessage: "Work order completed successfully",
    onSuccess: () => setViewModalOpen(false),
  });

  const handleViewOrder = (order: WorkOrder) => {
    console.log("Clicked View on", order.equipmentId, "work order");
    setSelectedOrder(order);
    setViewModalOpen(true);
  };

  const handleEditOrder = (order: WorkOrder) => {
    console.log("Clicked Edit on", order.equipmentId, "work order");
    setSelectedOrder(order);
    setEditForm({
      equipmentId: order.equipmentId,
      reason: order.reason,
      description: order.description,
      priority: order.priority,
      status: order.status,
      estimatedDowntimeHours: order.estimatedDowntimeHours,
      actualDowntimeHours: order.actualDowntimeHours,
      affectsVesselDowntime: order.affectsVesselDowntime
    });
    setEditModalOpen(true);
  };

  const handleDeleteOrder = (order: WorkOrder) => {
    const displayId = order.woNumber || order.id;
    if (confirm(`Are you sure you want to delete work order "${displayId}"? This action cannot be undone.`)) {
      deleteMutation.mutate(order.id);
    }
  };

  const handleCreateOrder = () => {
    console.log("Clicked Create Work Order");
    setSelectedVesselIdForCreate('');
    setCreateForm({ 
      equipmentId: '', 
      vesselId: '',
      reason: '', 
      description: '', 
      priority: 2, 
      estimatedDowntimeHours: undefined, 
      actualDowntimeHours: undefined, 
      affectsVesselDowntime: false 
    });
    setCreateModalOpen(true);
  };

  const handleClearAllOrders = () => {
    if (confirm(`Are you sure you want to clear ALL work orders? This action cannot be undone and will remove ${workOrders?.length || 0} work orders.`)) {
      clearAllMutation.mutate();
    }
  };

  const handleCreateSubmit = () => {
    // Debug logging
    console.log('[WorkOrder Create] Form state:', {
      selectedVesselIdForCreate,
      createForm,
      validation: {
        hasVessel: !!selectedVesselIdForCreate,
        hasEquipment: !!createForm.equipmentId,
        hasReason: !!createForm.reason
      }
    });
    
    if (!selectedVesselIdForCreate || !createForm.equipmentId || !createForm.reason) {
      toast({ 
        title: "Please fill in required fields", 
        description: "Vessel, Equipment, and Reason are required",
        variant: "destructive" 
      });
      return;
    }
    
    // Prepare the payload with required orgId field and vesselId
    const payload: InsertWorkOrder = {
      ...createForm,
      orgId: getCurrentOrgId(), // Get user's organization context
      vesselId: selectedVesselIdForCreate,
      equipmentId: createForm.equipmentId!,
      reason: createForm.reason!,
      priority: createForm.priority || 2,
    };
    
    console.log('[WorkOrder Create] Submitting payload:', payload);
    createMutation.mutate(payload);
  };

  const handleEditSubmit = () => {
    if (!selectedOrder) return;
    updateMutation.mutate({
      id: selectedOrder.id,
      updates: editForm
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <TableSkeleton rows={10} columns={8} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-destructive">Error loading work orders: {error.message}</div>
      </div>
    );
  }

  const openOrders = workOrders?.filter(wo => wo.status !== "completed") || [];
  const completedOrders = workOrders?.filter(wo => wo.status === "completed") || [];
  const highPriorityOrders = workOrders?.filter(wo => wo.priority === 1) || [];

  // Helper function to get equipment name from ID
  const getEquipmentName = (equipmentId: string) => {
    const equipmentItem = equipment.find(e => e.id === equipmentId);
    return equipmentItem?.name || equipmentId;
  };

  // Helper function to get vessel info from work order
  const getVesselName = (vesselId: string | null) => {
    if (!vesselId) return 'Not assigned';
    const vessel = vessels.find(v => v.id === vesselId);
    return vessel?.name || vesselId;
  };

  // Helper function to calculate elapsed time or duration
  const getWorkOrderDuration = (order: WorkOrder) => {
    if (order.status === 'completed' && order.actualDuration) {
      const hours = Math.floor(order.actualDuration / 60);
      const minutes = order.actualDuration % 60;
      return `${hours}h ${minutes}m`;
    }
    if (order.actualStartDate && order.status !== 'completed') {
      const start = new Date(order.actualStartDate);
      const now = new Date();
      const durationMs = now.getTime() - start.getTime();
      const minutes = Math.floor(durationMs / (1000 * 60));
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m (in progress)`;
    }
    return 'Not started';
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1:
        return "bg-destructive/20 text-destructive";
      case 2:
        return "bg-chart-2/20 text-chart-2";
      default:
        return "bg-chart-3/20 text-chart-3";
    }
  };

  // Handle sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Sort work orders
  const sortWorkOrders = (orders: WorkOrder[]) => {
    if (!orders) return [];
    
    const sorted = [...orders].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortColumn) {
        case 'orderId':
          aValue = a.woNumber || a.id;
          bValue = b.woNumber || b.id;
          break;
        case 'equipment':
          aValue = getEquipmentName(a.equipmentId);
          bValue = getEquipmentName(b.equipmentId);
          break;
        case 'priority':
          aValue = a.priority;
          bValue = b.priority;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'created':
          aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1:
        return "High";
      case 2:
        return "Medium";
      default:
        return "Low";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-chart-3/20 text-chart-3";
      case "in_progress":
        return "bg-chart-2/20 text-chart-2";
      default:
        return "bg-muted/20 text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Work Orders</h2>
            <p className="text-muted-foreground">Manage maintenance requests and scheduling</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              variant="destructive"
              data-testid="button-clear-all-work-orders"
              onClick={handleClearAllOrders}
              disabled={clearAllMutation.isPending || !workOrders?.length}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {clearAllMutation.isPending ? "Clearing..." : "Clear All"}
            </Button>
            <Button 
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              data-testid="button-create-work-order"
              onClick={handleCreateOrder}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Work Order
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Work Order Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Total Orders</p>
                  <p className="text-2xl font-bold text-foreground mt-1" data-testid="stat-total-orders">
                    {workOrders?.length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Open</p>
                  <p className="text-2xl font-bold text-chart-2 mt-1" data-testid="stat-open-orders">
                    {openOrders.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">High Priority</p>
                  <p className="text-2xl font-bold text-destructive mt-1" data-testid="stat-high-priority-orders">
                    {highPriorityOrders.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Completed</p>
                  <p className="text-2xl font-bold text-chart-3 mt-1" data-testid="stat-completed-orders">
                    {completedOrders.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Work Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Work Order Management</CardTitle>
            <p className="text-sm text-muted-foreground">
              Track and manage maintenance work orders across your fleet
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveTable
              data={sortWorkOrders(workOrders || [])}
              keyExtractor={(order) => order.id}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              columns={[
                {
                  header: "Order ID",
                  mobileLabel: "ID",
                  sortable: true,
                  sortKey: "orderId",
                  accessor: (order) => (
                    <span className="font-mono text-sm" data-testid={`order-id-${order.id}`}>
                      {order.woNumber || order.id}
                    </span>
                  ),
                },
                {
                  header: "Equipment",
                  sortable: true,
                  sortKey: "equipment",
                  accessor: (order) => (
                    <span data-testid={`order-equipment-${order.id}`}>
                      {getEquipmentName(order.equipmentId)}
                    </span>
                  ),
                },
                {
                  header: "Priority",
                  sortable: true,
                  sortKey: "priority",
                  accessor: (order) => (
                    <Badge 
                      className={getPriorityColor(order.priority)}
                      data-testid={`order-priority-${order.id}`}
                    >
                      {getPriorityLabel(order.priority)}
                    </Badge>
                  ),
                },
                {
                  header: "Status",
                  sortable: true,
                  sortKey: "status",
                  accessor: (order) => (
                    <Badge 
                      className={getStatusColor(order.status)}
                      data-testid={`order-status-${order.id}`}
                    >
                      {order.status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                  ),
                },
                {
                  header: "Reason",
                  accessor: (order) => (
                    <span 
                      className="max-w-xs truncate block" 
                      title={order.reason || "No reason provided"}
                      data-testid={`order-reason-${order.id}`}
                    >
                      {order.reason || "No reason provided"}
                    </span>
                  ),
                  className: "max-w-xs",
                },
                {
                  header: "Created",
                  sortable: true,
                  sortKey: "created",
                  accessor: (order) => (
                    <span data-testid={`order-created-${order.id}`}>
                      {order.createdAt 
                        ? formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })
                        : "Unknown"
                      }
                    </span>
                  ),
                },
              ]}
              actions={(order) => (
                <>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    data-testid={`button-view-order-${order.id}`}
                    onClick={() => handleViewOrder(order)}
                    aria-label="View order"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    data-testid={`button-edit-order-${order.id}`}
                    onClick={() => handleEditOrder(order)}
                    aria-label="Edit order"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDeleteOrder(order)}
                    className="text-destructive hover:text-destructive"
                    data-testid={`button-delete-order-${order.id}`}
                    aria-label="Delete order"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
              emptyMessage="No work orders found. Create one to get started."
            />
          </CardContent>
        </Card>
      </div>

      {/* View Order Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" data-testid="order-detail-panel">
          <DialogHeader>
            <DialogTitle>Work Order {selectedOrder?.woNumber || selectedOrder?.id}</DialogTitle>
            <DialogDescription>
              Manage work order and parts for {selectedOrder && getEquipmentName(selectedOrder.equipmentId)}
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Order Details
                </TabsTrigger>
                <TabsTrigger value="parts" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Parts Management
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4 mt-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm font-medium">Order ID</Label>
                    <p className="text-sm text-muted-foreground font-mono">{selectedOrder.woNumber || selectedOrder.id}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Vessel</Label>
                    <p className="text-sm text-muted-foreground font-semibold">{getVesselName(selectedOrder.vesselId)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Equipment</Label>
                    <p className="text-sm text-muted-foreground">{getEquipmentName(selectedOrder.equipmentId)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Duration</Label>
                    <p className="text-sm text-muted-foreground font-semibold">{getWorkOrderDuration(selectedOrder)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Priority</Label>
                    <Badge className={getPriorityColor(selectedOrder.priority)}>
                      {getPriorityLabel(selectedOrder.priority)}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <Badge className={getStatusColor(selectedOrder.status)}>
                      {selectedOrder.status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-sm font-medium">Reason</Label>
                    <p className="text-sm text-muted-foreground">{selectedOrder.reason || "No reason provided"}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-sm font-medium">Description</Label>
                    <p className="text-sm text-muted-foreground" data-testid="text-order-description">{selectedOrder.description || "No description provided"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Created</Label>
                    <p className="text-sm text-muted-foreground">
                      {selectedOrder.createdAt 
                        ? formatDistanceToNow(new Date(selectedOrder.createdAt), { addSuffix: true })
                        : "Unknown"
                      }
                    </p>
                  </div>
                  {selectedOrder.actualDowntimeHours && (
                    <div>
                      <Label className="text-sm font-medium">Actual Downtime</Label>
                      <p className="text-sm text-muted-foreground">{selectedOrder.actualDowntimeHours}h</p>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  {selectedOrder.status !== 'completed' && (
                    <Button 
                      onClick={() => completeWorkOrderMutation.mutate(selectedOrder.id)}
                      disabled={completeWorkOrderMutation.isPending}
                      variant="default"
                      data-testid="button-complete-work-order"
                    >
                      {completeWorkOrderMutation.isPending ? "Completing..." : "Complete Work Order"}
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setViewModalOpen(false)}>
                    Close
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="parts" className="mt-6">
                <MultiPartSelector 
                  workOrderId={selectedOrder.id}
                  onPartsAdded={() => {
                    // Refresh work orders data when parts are added
                    queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
                  }}
                />
                <div className="flex justify-end pt-4">
                  <Button variant="outline" onClick={() => setViewModalOpen(false)}>
                    Close
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Order Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-md" data-testid="order-edit-form">
          <DialogHeader>
            <DialogTitle>Edit Work Order {selectedOrder?.woNumber || selectedOrder?.id}</DialogTitle>
            <DialogDescription>
              Update work order details for {selectedOrder && getEquipmentName(selectedOrder.equipmentId)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-equipment">Equipment</Label>
              <Select 
                value={editForm.equipmentId || ''} 
                onValueChange={(value) => setEditForm(prev => ({ ...prev, equipmentId: value }))}
              >
                <SelectTrigger data-testid="select-edit-equipment">
                  <SelectValue placeholder="Select equipment" />
                </SelectTrigger>
                <SelectContent>
                  {equipment
                    .filter((eq: any) => eq.id && eq.id.trim() !== '')
                    .map((eq: any) => (
                      <SelectItem key={eq.id} value={eq.id}>
                        {eq.name || eq.id}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-reason">Reason</Label>
              <Textarea
                id="edit-reason"
                value={editForm.reason || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Describe the maintenance issue..."
                data-testid="input-edit-reason"
              />
            </div>
            <div>
              <Label htmlFor="edit-priority">Priority</Label>
              <Select 
                value={editForm.priority?.toString() || '2'} 
                onValueChange={(value) => setEditForm(prev => ({ ...prev, priority: parseInt(value) }))}
              >
                <SelectTrigger data-testid="select-edit-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">High</SelectItem>
                  <SelectItem value="2">Medium</SelectItem>
                  <SelectItem value="3">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-status">Status</Label>
              <Select 
                value={editForm.status || 'open'} 
                onValueChange={(value) => setEditForm(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger data-testid="select-edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-estimated-downtime">Estimated Downtime (hours)</Label>
                <Input
                  id="edit-estimated-downtime"
                  type="number"
                  step="0.1"
                  min="0"
                  value={editForm.estimatedDowntimeHours || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, estimatedDowntimeHours: e.target.value ? parseFloat(e.target.value) : undefined }))}
                  placeholder="0.0"
                  data-testid="input-edit-estimated-downtime"
                />
              </div>
              <div>
                <Label htmlFor="edit-actual-downtime">Actual Downtime (hours)</Label>
                <Input
                  id="edit-actual-downtime"
                  type="number"
                  step="0.1"
                  min="0"
                  value={editForm.actualDowntimeHours || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, actualDowntimeHours: e.target.value ? parseFloat(e.target.value) : undefined }))}
                  placeholder="0.0"
                  data-testid="input-edit-actual-downtime"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-affects-downtime"
                checked={editForm.affectsVesselDowntime || false}
                onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, affectsVesselDowntime: checked as boolean }))}
                data-testid="checkbox-edit-affects-downtime"
              />
              <Label htmlFor="edit-affects-downtime" className="text-sm font-normal cursor-pointer">
                This work order affects vessel downtime
              </Label>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-0 sm:space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setEditModalOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleEditSubmit}
                disabled={updateMutation.isPending}
                data-testid="button-save-edit"
                className="w-full sm:w-auto"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Order Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md" data-testid="work-order-form">
          <DialogHeader>
            <DialogTitle>Create Work Order</DialogTitle>
            <DialogDescription>
              Create a new maintenance work order
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="create-vessel">Vessel *</Label>
              <Select 
                value={selectedVesselIdForCreate || ''} 
                onValueChange={(value) => {
                  setSelectedVesselIdForCreate(value);
                  // Reset equipment selection when vessel changes
                  setCreateForm(prev => ({ ...prev, equipmentId: '', vesselId: value }));
                }}
              >
                <SelectTrigger data-testid="select-create-vessel">
                  <SelectValue placeholder="Select vessel first" />
                </SelectTrigger>
                <SelectContent>
                  {vessels
                    .filter((v: any) => v.id && v.name)
                    .map((v: any) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="create-equipment">Equipment *</Label>
              <Select 
                value={createForm.equipmentId || ''} 
                onValueChange={(value) => setCreateForm(prev => ({ ...prev, equipmentId: value }))}
                disabled={!selectedVesselIdForCreate}
              >
                <SelectTrigger data-testid="select-create-equipment">
                  <SelectValue placeholder={selectedVesselIdForCreate ? "Select equipment" : "Select vessel first"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredEquipmentForCreate
                    .filter((eq: any) => eq.id && eq.id.trim() !== '')
                    .map((eq: any) => (
                      <SelectItem key={eq.id} value={eq.id}>
                        {eq.name || eq.id} {eq.type ? `(${eq.type})` : ''}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {selectedVesselIdForCreate && filteredEquipmentForCreate.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  No equipment found for this vessel
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="create-assigned-crew">Assign to Crew Member</Label>
              <Select 
                value={createForm.assignedCrewId || ''} 
                onValueChange={(value) => setCreateForm(prev => ({ ...prev, assignedCrewId: value }))}
                disabled={!selectedVesselIdForCreate}
              >
                <SelectTrigger data-testid="select-create-crew">
                  <SelectValue placeholder={selectedVesselIdForCreate ? "Select crew member (optional)" : "Select vessel first"} />
                </SelectTrigger>
                <SelectContent>
                  {crewMembers
                    .filter((c: any) => c.id && c.name)
                    .map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} - {c.rank || c.position || 'Crew'}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {selectedVesselIdForCreate && crewMembers.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  No crew members found for this vessel
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="create-reason">Reason *</Label>
              <Textarea
                id="create-reason"
                value={createForm.reason || ''}
                onChange={(e) => setCreateForm(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Describe the maintenance issue..."
                data-testid="input-create-reason"
              />
            </div>
            <div>
              <Label htmlFor="create-description">Description</Label>
              <Textarea
                id="create-description"
                value={createForm.description || ''}
                onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Additional details (optional)"
                data-testid="input-create-description"
              />
            </div>
            <div>
              <Label htmlFor="create-priority">Priority</Label>
              <Select 
                value={createForm.priority?.toString() || '2'} 
                onValueChange={(value) => setCreateForm(prev => ({ ...prev, priority: parseInt(value) }))}
              >
                <SelectTrigger data-testid="select-create-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">High</SelectItem>
                  <SelectItem value="2">Medium</SelectItem>
                  <SelectItem value="3">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="create-estimated-downtime">Estimated Downtime (hours)</Label>
                <Input
                  id="create-estimated-downtime"
                  type="number"
                  step="0.1"
                  min="0"
                  value={createForm.estimatedDowntimeHours || ''}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, estimatedDowntimeHours: e.target.value ? parseFloat(e.target.value) : undefined }))}
                  placeholder="0.0"
                  data-testid="input-create-estimated-downtime"
                />
              </div>
              <div>
                <Label htmlFor="create-actual-downtime">Actual Downtime (hours)</Label>
                <Input
                  id="create-actual-downtime"
                  type="number"
                  step="0.1"
                  min="0"
                  value={createForm.actualDowntimeHours || ''}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, actualDowntimeHours: e.target.value ? parseFloat(e.target.value) : undefined }))}
                  placeholder="0.0"
                  data-testid="input-create-actual-downtime"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="create-affects-downtime"
                checked={createForm.affectsVesselDowntime || false}
                onCheckedChange={(checked) => setCreateForm(prev => ({ ...prev, affectsVesselDowntime: checked as boolean }))}
                data-testid="checkbox-create-affects-downtime"
              />
              <Label htmlFor="create-affects-downtime" className="text-sm font-normal cursor-pointer">
                This work order affects vessel downtime
              </Label>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-0 sm:space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setCreateModalOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateSubmit}
                disabled={createMutation.isPending}
                data-testid="button-save-create"
                className="w-full sm:w-auto"
              >
                {createMutation.isPending ? "Creating..." : "Create Order"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
