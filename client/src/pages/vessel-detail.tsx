import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { ArrowLeft, Ship, Server, Wrench, Users, DollarSign, Activity, Calendar, TrendingUp, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function VesselDetail() {
  const [match, params] = useRoute("/vessels/:id");
  const vesselId = params?.id;

  const { data: vessel, isLoading: vesselLoading } = useQuery({
    queryKey: ["/api/vessels", vesselId],
    queryFn: () => apiRequest("GET", `/api/vessels/${vesselId}`),
    enabled: !!vesselId,
  });

  const { data: equipment = [], isLoading: equipmentLoading } = useQuery({
    queryKey: ["/api/vessels", vesselId, "equipment"],
    queryFn: () => apiRequest("GET", `/api/vessels/${vesselId}/equipment`),
    enabled: !!vesselId,
  });

  const { data: workOrders = [], isLoading: workOrdersLoading } = useQuery({
    queryKey: ["/api/work-orders"],
    queryFn: () => apiRequest("GET", "/api/work-orders"),
  });

  const { data: crew = [], isLoading: crewLoading } = useQuery({
    queryKey: ["/api/crew"],
    queryFn: () => apiRequest("GET", "/api/crew"),
  });

  const { data: maintenanceSchedules = [], isLoading: schedulesLoading } = useQuery({
    queryKey: ["/api/maintenance-schedules"],
    queryFn: () => apiRequest("GET", "/api/maintenance-schedules"),
  });

  if (!match || vesselLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!vessel) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Vessel not found</h3>
              <p className="text-muted-foreground">The vessel you're looking for doesn't exist.</p>
              <Button asChild className="mt-4">
                <Link href="/vessel-management">Back to Vessels</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const vesselWorkOrders = workOrders.filter(wo => {
    const woEquipment = equipment.find(eq => eq.id === wo.equipmentId);
    return woEquipment?.vesselId === vesselId || woEquipment?.vesselName === vessel.name;
  });

  const vesselCrew = crew.filter(c => c.vesselId === vesselId);

  const vesselMaintenanceSchedules = maintenanceSchedules.filter(ms => {
    const msEquipment = equipment.find(eq => eq.id === ms.equipmentId);
    return msEquipment?.vesselId === vesselId;
  });

  const activeWorkOrders = vesselWorkOrders.filter(wo => wo.status === 'open' || wo.status === 'in_progress');
  const completedWorkOrders = vesselWorkOrders.filter(wo => wo.status === 'completed');

  const utilizationRate = vessel.operationDays && vessel.downtimeDays
    ? ((vessel.operationDays / (vessel.operationDays + vessel.downtimeDays)) * 100).toFixed(1)
    : 'N/A';

  const totalCost = vessel.dayRateSgd && vessel.operationDays
    ? (parseFloat(vessel.dayRateSgd) * vessel.operationDays).toFixed(2)
    : 'N/A';

  return (
    <div className="p-6 space-y-6" data-testid="vessel-detail-page">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/vessel-management">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Ship className="h-8 w-8" />
              {vessel.name}
            </h1>
            <p className="text-muted-foreground">
              {vessel.vesselClass?.replace('_', ' ').toUpperCase()} • {vessel.condition?.toUpperCase()}
            </p>
          </div>
        </div>
        <Badge variant={vessel.onlineStatus === 'online' ? 'default' : 'secondary'}>
          {vessel.onlineStatus?.toUpperCase()}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Equipment</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{equipment.length}</div>
            <p className="text-xs text-muted-foreground">
              Total registered equipment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Work Orders</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeWorkOrders.length}</div>
            <p className="text-xs text-muted-foreground">
              {completedWorkOrders.length} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Crew Assigned</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vesselCrew.length}</div>
            <p className="text-xs text-muted-foreground">
              Active crew members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilization Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{utilizationRate}%</div>
            <p className="text-xs text-muted-foreground">
              {vessel.operationDays || 0} days operational
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="equipment" data-testid="tab-equipment">Equipment ({equipment.length})</TabsTrigger>
          <TabsTrigger value="work-orders" data-testid="tab-work-orders">Work Orders ({activeWorkOrders.length})</TabsTrigger>
          <TabsTrigger value="crew" data-testid="tab-crew">Crew ({vesselCrew.length})</TabsTrigger>
          <TabsTrigger value="maintenance" data-testid="tab-maintenance">Maintenance ({vesselMaintenanceSchedules.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Vessel Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Class:</span>
                  <span className="font-medium">{vessel.vesselClass?.replace('_', ' ') || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Condition:</span>
                  <span className="font-medium">{vessel.condition || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-medium">{vessel.onlineStatus || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Day Rate:</span>
                  <span className="font-medium">SGD {vessel.dayRateSgd || 'N/A'}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Operation Days:</span>
                  <span className="font-medium">{vessel.operationDays || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Downtime Days:</span>
                  <span className="font-medium">{vessel.downtimeDays || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Revenue:</span>
                  <span className="font-medium">SGD {totalCost}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Utilization:</span>
                  <span className="font-medium">{utilizationRate}%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="equipment">
          <Card>
            <CardHeader>
              <CardTitle>Equipment List</CardTitle>
              <CardDescription>All equipment registered to this vessel</CardDescription>
            </CardHeader>
            <CardContent>
              {equipmentLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                </div>
              ) : equipment.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No equipment found for this vessel
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {equipment.map((eq) => (
                      <TableRow key={eq.id}>
                        <TableCell className="font-mono">{eq.id}</TableCell>
                        <TableCell>{eq.name}</TableCell>
                        <TableCell>{eq.type || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{eq.status || 'Unknown'}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="work-orders">
          <Card>
            <CardHeader>
              <CardTitle>Work Orders</CardTitle>
              <CardDescription>Active and completed maintenance work</CardDescription>
            </CardHeader>
            <CardContent>
              {workOrdersLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                </div>
              ) : vesselWorkOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No work orders found for this vessel
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Equipment</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vesselWorkOrders.map((wo) => (
                      <TableRow key={wo.id}>
                        <TableCell className="font-mono text-sm">{wo.id.slice(0, 8)}</TableCell>
                        <TableCell>{wo.equipmentId}</TableCell>
                        <TableCell className="max-w-xs truncate">{wo.description}</TableCell>
                        <TableCell>
                          <Badge variant={
                            wo.status === 'completed' ? 'default' :
                            wo.status === 'in_progress' ? 'secondary' : 'outline'
                          }>
                            {wo.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(wo.createdAt), { addSuffix: true })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="crew">
          <Card>
            <CardHeader>
              <CardTitle>Crew Members</CardTitle>
              <CardDescription>Personnel assigned to this vessel</CardDescription>
            </CardHeader>
            <CardContent>
              {crewLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                </div>
              ) : vesselCrew.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No crew members assigned to this vessel
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Rank</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vesselCrew.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.name}</TableCell>
                        <TableCell>{member.role || 'N/A'}</TableCell>
                        <TableCell>{member.rank || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{member.status || 'Active'}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Schedules</CardTitle>
              <CardDescription>Scheduled and predictive maintenance</CardDescription>
            </CardHeader>
            <CardContent>
              {schedulesLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                </div>
              ) : vesselMaintenanceSchedules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No maintenance schedules found for this vessel
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Equipment</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Scheduled Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vesselMaintenanceSchedules.map((schedule) => (
                      <TableRow key={schedule.id}>
                        <TableCell>{schedule.equipmentId}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {schedule.isPredictive ? 'Predictive' : 'Scheduled'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(schedule.scheduledDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            schedule.status === 'completed' ? 'default' :
                            schedule.status === 'in_progress' ? 'secondary' : 'outline'
                          }>
                            {schedule.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
