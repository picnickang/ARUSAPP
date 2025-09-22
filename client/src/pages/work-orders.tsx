import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Eye, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { fetchWorkOrders } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { queryClient } from "@/lib/queryClient";

export default function WorkOrders() {
  const { data: workOrders, isLoading, error } = useQuery({
    queryKey: ["/api/work-orders"],
    queryFn: () => fetchWorkOrders(),
    refetchInterval: 60000, // Refresh every minute
  });

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
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              data-testid="button-create-work-order"
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
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            data-testid={`button-edit-order-${order.id}`}
                          >
                            <Edit className="h-4 w-4" />
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
    </div>
  );
}
