import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Eye, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchWorkOrders } from "@/lib/api";
import { formatDistanceToNow, format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getCurrentOrgId } from "@/hooks/useOrganization";
import { WorkOrder, InsertWorkOrder } from "@shared/schema";

export default function WorkOrders() {
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<WorkOrder>>({});
  const [createForm, setCreateForm] = useState<Partial<InsertWorkOrder>>({
    equipmentId: '',
    reason: '',
    description: '',
    priority: 2
  });
  const { toast } = useToast();
  
  const { data: workOrders, isLoading, error } = useQuery({
    queryKey: ["/api/work-orders"],
    queryFn: () => fetchWorkOrders(),
    refetchInterval: 60000, // Refresh every minute
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertWorkOrder) => 
      apiRequest("POST", "/api/work-orders", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      setCreateModalOpen(false);
      setCreateForm({ equipmentId: '', reason: '', description: '', priority: 2 });
      toast({ title: "Work order created successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create work order", 
        description: error?.message || "An error occurred",
        variant: "destructive" 
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; updates: Partial<WorkOrder> }) => 
      apiRequest("PUT", `/api/work-orders/${data.id}`, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      setEditModalOpen(false);
      setSelectedOrder(null);
      setEditForm({});
      toast({ title: "Work order updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update work order", 
        description: error?.message || "An error occurred",
        variant: "destructive" 
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => 
      apiRequest("DELETE", `/api/work-orders/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      toast({ title: "Work order deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete work order", 
        description: error?.message || "An error occurred",
        variant: "destructive" 
      });
    }
  });

  const clearAllMutation = useMutation({
    mutationFn: () => 
      apiRequest("DELETE", "/api/work-orders/clear"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      toast({ title: "All work orders cleared successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to clear work orders", 
        description: error?.message || "An error occurred",
        variant: "destructive" 
      });
    }
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
      status: order.status
    });
    setEditModalOpen(true);
  };

  const handleDeleteOrder = (order: WorkOrder) => {
    if (confirm(`Are you sure you want to delete work order "${order.id}"? This action cannot be undone.`)) {
      deleteMutation.mutate(order.id);
    }
  };

  const handleCreateOrder = () => {
    console.log("Clicked Create Work Order");
    setCreateModalOpen(true);
  };

  const handleClearAllOrders = () => {
    if (confirm(`Are you sure you want to clear ALL work orders? This action cannot be undone and will remove ${workOrders?.length || 0} work orders.`)) {
      clearAllMutation.mutate();
    }
  };

  const handleCreateSubmit = () => {
    if (!createForm.equipmentId || !createForm.reason) {
      toast({ 
        title: "Please fill in required fields", 
        description: "Equipment ID and reason are required",
        variant: "destructive" 
      });
      return;
    }
    
    // Prepare the payload with required orgId field
    const payload: InsertWorkOrder = {
      ...createForm,
      orgId: getCurrentOrgId(), // Get user's organization context
      equipmentId: createForm.equipmentId!,
      reason: createForm.reason!,
      priority: createForm.priority || 2,
    };
    
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading work orders...</div>
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
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workOrders?.map((order) => (
                    <TableRow key={order.id} className="hover:bg-muted">
                      <TableCell className="font-mono text-sm" data-testid={`order-id-${order.id}`}>
                        {order.id}
                      </TableCell>
                      <TableCell data-testid={`order-equipment-${order.id}`}>
                        {order.equipmentId}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={getPriorityColor(order.priority)}
                          data-testid={`order-priority-${order.id}`}
                        >
                          {getPriorityLabel(order.priority)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={getStatusColor(order.status)}
                          data-testid={`order-status-${order.id}`}
                        >
                          {order.status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                      </TableCell>
                      <TableCell 
                        className="max-w-xs truncate" 
                        title={order.reason || "No reason provided"}
                        data-testid={`order-reason-${order.id}`}
                      >
                        {order.reason || "No reason provided"}
                      </TableCell>
                      <TableCell data-testid={`order-created-${order.id}`}>
                        {order.createdAt 
                          ? formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })
                          : "Unknown"
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            data-testid={`button-view-order-${order.id}`}
                            onClick={() => handleViewOrder(order)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            data-testid={`button-edit-order-${order.id}`}
                            onClick={() => handleEditOrder(order)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteOrder(order)}
                            className="text-destructive hover:text-destructive"
                            data-testid={`button-delete-order-${order.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Order Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-md" data-testid="order-detail-panel">
          <DialogHeader>
            <DialogTitle>Work Order Details</DialogTitle>
            <DialogDescription>
              View work order information for {selectedOrder?.equipmentId}
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Order ID</Label>
                <p className="text-sm text-muted-foreground font-mono">{selectedOrder.id}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Equipment</Label>
                <p className="text-sm text-muted-foreground">{selectedOrder.equipmentId}</p>
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
              <div>
                <Label className="text-sm font-medium">Reason</Label>
                <p className="text-sm text-muted-foreground">{selectedOrder.reason || "No reason provided"}</p>
              </div>
              <div>
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
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setViewModalOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Order Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-md" data-testid="order-edit-form">
          <DialogHeader>
            <DialogTitle>Edit Work Order</DialogTitle>
            <DialogDescription>
              Update work order details for {selectedOrder?.equipmentId}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-equipment">Equipment ID</Label>
              <Input
                id="edit-equipment"
                value={editForm.equipmentId || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, equipmentId: e.target.value }))}
                data-testid="input-edit-equipment"
              />
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
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEditModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleEditSubmit}
                disabled={updateMutation.isPending}
                data-testid="button-save-edit"
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
              <Label htmlFor="create-equipment">Equipment ID *</Label>
              <Input
                id="create-equipment"
                value={createForm.equipmentId || ''}
                onChange={(e) => setCreateForm(prev => ({ ...prev, equipmentId: e.target.value }))}
                placeholder="e.g., ENG1, PUMP2, GEN1"
                data-testid="input-create-equipment"
              />
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
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateSubmit}
                disabled={createMutation.isPending}
                data-testid="button-save-create"
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
