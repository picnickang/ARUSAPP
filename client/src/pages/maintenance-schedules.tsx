import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Plus, Calendar, List, Eye, Edit, Trash2, Clock, Zap, Search, Filter, X, AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ResponsiveTable } from "@/components/shared/ResponsiveTable";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow, format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isPast, isFuture } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getCurrentOrgId } from "@/hooks/useOrganization";
import { MaintenanceSchedule, InsertMaintenanceSchedule } from "@shared/schema";
import { useCreateMutation, useUpdateMutation, useDeleteMutation } from "@/hooks/useCrudMutations";

interface CalendarViewProps {
  schedules: MaintenanceSchedule[];
  onScheduleClick: (schedule: MaintenanceSchedule) => void;
  getEquipmentName: (id: string) => string;
}

function CalendarView({ schedules, onScheduleClick, getEquipmentName }: CalendarViewProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  
  const getSchedulesForDay = (day: Date) => {
    return schedules.filter(schedule => 
      isSameDay(new Date(schedule.scheduledDate), day)
    );
  };
  
  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return "bg-red-500/10 dark:bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30";
      case 2: return "bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30";
      case 3: return "bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30";
      default: return "bg-gray-500/10 dark:bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30";
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Weekly Schedule</CardTitle>
            <CardDescription className="mt-1">
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline" 
              size="sm"
              onClick={() => setCurrentWeek(addDays(currentWeek, -7))}
              data-testid="button-prev-week"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm" 
              onClick={() => setCurrentWeek(new Date())}
              data-testid="button-current-week"
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentWeek(addDays(currentWeek, 7))}
              data-testid="button-next-week"
            >
              Next
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day, index) => {
            const isToday = isSameDay(day, new Date());
            const daySchedules = getSchedulesForDay(day);
            
            return (
              <div 
                key={index} 
                className={`rounded-lg border ${isToday ? 'border-primary/50 bg-primary/5' : 'border-border'} overflow-hidden`}
              >
                <div className={`p-2 text-center border-b ${isToday ? 'bg-primary/10 border-primary/30' : 'bg-muted/30'}`}>
                  <div className="text-xs font-medium text-muted-foreground">
                    {format(day, 'EEE')}
                  </div>
                  <div className={`text-lg font-bold ${isToday ? 'text-primary' : ''}`}>
                    {format(day, 'd')}
                  </div>
                </div>
                <div className="p-1 space-y-1 min-h-[120px]">
                  {daySchedules.map((schedule) => (
                    <button
                      key={schedule.id}
                      onClick={() => onScheduleClick(schedule)}
                      className={`w-full p-1.5 rounded border text-left text-xs hover:opacity-80 transition-opacity ${getPriorityColor(schedule.priority)}`}
                      data-testid={`schedule-item-${schedule.id}`}
                    >
                      <div className="font-medium truncate">
                        {getEquipmentName(schedule.equipmentId)}
                      </div>
                      <div className="text-xs opacity-75 mt-0.5">
                        {format(new Date(schedule.scheduledDate), 'h:mm a')}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function MaintenanceSchedules() {
  const [selectedSchedule, setSelectedSchedule] = useState<MaintenanceSchedule | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<MaintenanceSchedule>>({});
  const [createForm, setCreateForm] = useState<Partial<InsertMaintenanceSchedule> & { scheduledDate?: Date | string }>({
    equipmentId: '',
    scheduledDate: '',
    maintenanceType: 'preventive',
    priority: 2,
    description: '',
  });
  
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [viewType, setViewType] = useState<"calendar" | "list">("calendar");
  
  const { toast } = useToast();
  
  const { data: schedules, isLoading, error } = useQuery({
    queryKey: ["/api/maintenance-schedules"],
    refetchInterval: 60000,
  });
  
  const { data: equipment } = useQuery({
    queryKey: ["/api/equipment"],
  });
  
  const { data: upcomingSchedules } = useQuery({
    queryKey: ["/api/maintenance-schedules/upcoming"],
    queryFn: async () => {
      return await apiRequest("GET", "/api/maintenance-schedules/upcoming?days=7");
    },
    refetchInterval: 60000,
  });

  // Maintenance schedule mutations using reusable hooks
  const createMutation = useCreateMutation<InsertMaintenanceSchedule>('/api/maintenance-schedules', {
    successMessage: "✓ Schedule created successfully",
    onSuccess: () => {
      setCreateModalOpen(false);
      setCreateForm({ 
        equipmentId: '', 
        scheduledDate: '', 
        maintenanceType: 'preventive', 
        priority: 2,
        description: '' 
      });
    },
  });

  const updateMutation = useUpdateMutation<Partial<InsertMaintenanceSchedule>>('/api/maintenance-schedules', {
    successMessage: "✓ Schedule updated successfully",
    onSuccess: () => {
      setEditModalOpen(false);
      setSelectedSchedule(null);
      setEditForm({});
    },
  });

  const deleteMutation = useDeleteMutation('/api/maintenance-schedules', {
    successMessage: "✓ Schedule deleted successfully",
  });

  const getEquipmentName = (equipmentId: string) => {
    const eq = equipment?.find((e: any) => e.id === equipmentId);
    return eq?.name || equipmentId;
  };

  const handleViewSchedule = (schedule: MaintenanceSchedule) => {
    setSelectedSchedule(schedule);
    setViewModalOpen(true);
  };

  const handleEditSchedule = (schedule: MaintenanceSchedule) => {
    setSelectedSchedule(schedule);
    setEditForm({
      equipmentId: schedule.equipmentId,
      scheduledDate: typeof schedule.scheduledDate === 'string' 
        ? schedule.scheduledDate 
        : new Date(schedule.scheduledDate).toISOString().slice(0, 16),
      maintenanceType: schedule.maintenanceType,
      priority: schedule.priority,
      status: schedule.status,
      description: schedule.description,
      assignedTo: schedule.assignedTo,
    });
    setEditModalOpen(true);
  };

  const handleDeleteSchedule = (schedule: MaintenanceSchedule) => {
    const equipmentName = getEquipmentName(schedule.equipmentId);
    if (confirm(`Delete maintenance schedule for "${equipmentName}"? This cannot be undone.`)) {
      deleteMutation.mutate(schedule.id);
    }
  };

  const handleCreateSubmit = () => {
    if (!createForm.equipmentId || !createForm.scheduledDate || !createForm.maintenanceType) {
      toast({ 
        title: "Please fill in all required fields", 
        variant: "destructive" 
      });
      return;
    }
    
    const payload: InsertMaintenanceSchedule = {
      ...createForm,
      orgId: getCurrentOrgId(),
      scheduledDate: new Date(createForm.scheduledDate),
      equipmentId: createForm.equipmentId!,
      maintenanceType: createForm.maintenanceType!,
      priority: createForm.priority || 2,
    };
    
    createMutation.mutate(payload);
  };

  const handleEditSubmit = () => {
    if (!selectedSchedule || !editForm.equipmentId || !editForm.scheduledDate || !editForm.maintenanceType) {
      toast({ 
        title: "Please fill in all required fields", 
        variant: "destructive" 
      });
      return;
    }
    
    const updates = {
      ...editForm,
      scheduledDate: editForm.scheduledDate ? new Date(editForm.scheduledDate) : undefined
    };
    
    updateMutation.mutate({ 
      id: selectedSchedule.id, 
      updates: updates as Partial<InsertMaintenanceSchedule>
    });
  };

  const filteredSchedules = useMemo(() => {
    let filtered = Array.isArray(schedules) ? schedules as MaintenanceSchedule[] : [];
    
    if (searchText) {
      filtered = filtered.filter(schedule => 
        getEquipmentName(schedule.equipmentId).toLowerCase().includes(searchText.toLowerCase()) ||
        (schedule.description && schedule.description.toLowerCase().includes(searchText.toLowerCase())) ||
        (schedule.assignedTo && schedule.assignedTo.toLowerCase().includes(searchText.toLowerCase()))
      );
    }
    
    if (statusFilter !== "all") {
      filtered = filtered.filter(schedule => schedule.status === statusFilter);
    }
    
    if (priorityFilter !== "all") {
      filtered = filtered.filter(schedule => schedule.priority === parseInt(priorityFilter));
    }
    
    return filtered.sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
  }, [schedules, searchText, statusFilter, priorityFilter, equipment]);

  const getStatusBadge = (status: string) => {
    const styles = {
      'scheduled': 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
      'in_progress': 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
      'completed': 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/30',
      'cancelled': 'bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/30',
    };
    return <Badge className={`border ${styles[status as keyof typeof styles] || styles.scheduled}`}>
      {status.replace('_', ' ')}
    </Badge>;
  };

  const getPriorityBadge = (priority: number) => {
    const config = {
      1: { label: 'High', className: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30' },
      2: { label: 'Medium', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30' },
      3: { label: 'Low', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30' },
    };
    const p = config[priority as keyof typeof config] || config[2];
    return <Badge className={`border ${p.className}`}>{p.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded w-64"></div>
        <div className="h-48 bg-muted animate-pulse rounded"></div>
        <div className="h-96 bg-muted animate-pulse rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-destructive mb-4">
              <AlertCircle className="h-5 w-5" />
              <div className="font-medium">Failed to load maintenance schedules</div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{(error as any).message || 'Unknown error'}</p>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              data-testid="button-retry-maintenance"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with integrated filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Maintenance Schedules</h1>
            <p className="text-muted-foreground mt-1">Plan and track equipment maintenance</p>
          </div>
          <Button 
            onClick={() => setCreateModalOpen(true)}
            size="lg"
            data-testid="button-create-schedule"
          >
            <Plus className="w-4 h-4 mr-2" />
            Schedule Maintenance
          </Button>
        </div>

        {/* Compact Stats Bar */}
        <div className="flex flex-wrap items-center gap-4 md:gap-6 px-4 py-3 bg-muted/30 dark:bg-muted/20 rounded-lg border border-border/50">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Total:</span>
            <span className="text-sm font-bold" data-testid="stat-total">{schedules?.length || 0}</span>
          </div>
          <div className="hidden md:block h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm text-muted-foreground">Upcoming:</span>
            <span className="text-sm font-bold text-blue-700 dark:text-blue-300" data-testid="stat-upcoming">{upcomingSchedules?.length || 0}</span>
          </div>
          <div className="hidden md:block h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="text-sm text-muted-foreground">In Progress:</span>
            <span className="text-sm font-bold text-amber-700 dark:text-amber-300" data-testid="stat-in-progress">
              {schedules?.filter((s: any) => s.status === 'in_progress').length || 0}
            </span>
          </div>
          <div className="hidden md:block h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-sm text-muted-foreground">Completed:</span>
            <span className="text-sm font-bold text-green-700 dark:text-green-300" data-testid="stat-completed">
              {schedules?.filter((s: any) => s.status === 'completed').length || 0}
            </span>
          </div>
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search equipment or description..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-10"
                data-testid="input-search-schedules"
              />
              {searchText && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchText("")}
                  className="absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
                  aria-label="Clear search"
                  data-testid="button-clear-search"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger data-testid="select-status-filter">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger data-testid="select-priority-filter">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="1">High Priority</SelectItem>
                <SelectItem value="2">Medium Priority</SelectItem>
                <SelectItem value="3">Low Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <Tabs value={viewType} onValueChange={(v) => setViewType(v as "calendar" | "list")}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="calendar" data-testid="tab-calendar">
            <Calendar className="w-4 h-4 mr-2" />
            Calendar View
          </TabsTrigger>
          <TabsTrigger value="list" data-testid="tab-list">
            <List className="w-4 h-4 mr-2" />
            List View
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="calendar" className="mt-6">
          <CalendarView 
            schedules={filteredSchedules} 
            onScheduleClick={handleViewSchedule}
            getEquipmentName={getEquipmentName}
          />
        </TabsContent>
        
        <TabsContent value="list" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Schedule List</CardTitle>
              <CardDescription>{filteredSchedules.length} schedules found</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ResponsiveTable
                data={filteredSchedules}
                keyExtractor={(schedule) => schedule.id}
                columns={[
                  {
                    header: "Equipment",
                    accessor: (schedule: MaintenanceSchedule) => (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{getEquipmentName(schedule.equipmentId)}</span>
                        {schedule.autoGenerated && (
                          <Badge variant="outline" className="text-xs">
                            <Zap className="w-3 h-3 mr-1" />
                            Auto
                          </Badge>
                        )}
                      </div>
                    )
                  },
                  {
                    header: "Date & Time",
                    accessor: (schedule: MaintenanceSchedule) => (
                      <div>
                        <div className="font-medium" data-testid={`text-scheduled-date-${schedule.id}`}>
                          {format(new Date(schedule.scheduledDate), 'MMM d, yyyy')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(schedule.scheduledDate), 'h:mm a')}
                        </div>
                      </div>
                    )
                  },
                  {
                    header: "Type",
                    accessor: (schedule: MaintenanceSchedule) => (
                      <Badge variant="outline" className="capitalize">
                        {schedule.maintenanceType}
                      </Badge>
                    )
                  },
                  {
                    header: "Priority",
                    accessor: (schedule: MaintenanceSchedule) => getPriorityBadge(schedule.priority)
                  },
                  {
                    header: "Status",
                    accessor: (schedule: MaintenanceSchedule) => getStatusBadge(schedule.status)
                  },
                ]}
                actions={(schedule) => (
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleViewSchedule(schedule)}
                      data-testid={`button-view-schedule-${schedule.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleEditSchedule(schedule)}
                      data-testid={`button-edit-schedule-${schedule.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDeleteSchedule(schedule)}
                      className="text-destructive hover:text-destructive"
                      data-testid={`button-delete-schedule-${schedule.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                emptyMessage="No maintenance schedules found. Create one to get started."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Schedule Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-2xl" data-testid="schedule-detail-modal">
          <DialogHeader>
            <DialogTitle>Maintenance Schedule Details</DialogTitle>
            <DialogDescription>
              {selectedSchedule && getEquipmentName(selectedSchedule.equipmentId)}
            </DialogDescription>
          </DialogHeader>
          {selectedSchedule && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Equipment</Label>
                  <p className="text-base font-medium mt-1">{getEquipmentName(selectedSchedule.equipmentId)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Type</Label>
                  <p className="text-base capitalize mt-1">{selectedSchedule.maintenanceType}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Scheduled Date</Label>
                  <p className="text-base font-medium mt-1">
                    {format(new Date(selectedSchedule.scheduledDate), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedSchedule.status)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Priority</Label>
                  <div className="mt-1">{getPriorityBadge(selectedSchedule.priority)}</div>
                </div>
                {selectedSchedule.assignedTo && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Assigned To</Label>
                    <p className="text-base mt-1">{selectedSchedule.assignedTo}</p>
                  </div>
                )}
              </div>
              {selectedSchedule.description && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                  <p className="text-base mt-2 p-3 bg-muted/50 rounded-lg">{selectedSchedule.description}</p>
                </div>
              )}
              {selectedSchedule.autoGenerated && (
                <div className="flex items-center gap-2 p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                  <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm text-blue-700 dark:text-blue-300">
                    Automatically scheduled based on predictive analytics
                  </span>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Schedule Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-2xl" data-testid="create-schedule-modal">
          <DialogHeader>
            <DialogTitle>Schedule New Maintenance</DialogTitle>
            <DialogDescription>
              Create a new maintenance schedule for equipment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="create-equipment">Equipment *</Label>
              <Select 
                value={createForm.equipmentId || ''} 
                onValueChange={(value) => setCreateForm(prev => ({ ...prev, equipmentId: value }))}
              >
                <SelectTrigger data-testid="select-create-equipment">
                  <SelectValue placeholder="Select equipment" />
                </SelectTrigger>
                <SelectContent>
                  {equipment?.map((eq: any) => (
                    <SelectItem key={eq.id} value={eq.id}>
                      {eq.name || eq.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="create-date">Scheduled Date & Time *</Label>
                <Input
                  id="create-date"
                  type="datetime-local"
                  value={
                    createForm.scheduledDate 
                      ? (typeof createForm.scheduledDate === 'string' 
                          ? createForm.scheduledDate 
                          : new Date(createForm.scheduledDate).toISOString().slice(0, 16))
                      : ''
                  }
                  onChange={(e) => setCreateForm(prev => ({ ...prev, scheduledDate: e.target.value }))}
                  data-testid="input-create-schedule-date"
                />
              </div>
              <div>
                <Label htmlFor="create-type">Maintenance Type *</Label>
                <Select 
                  value={createForm.maintenanceType || 'preventive'} 
                  onValueChange={(value) => setCreateForm(prev => ({ ...prev, maintenanceType: value }))}
                >
                  <SelectTrigger data-testid="select-create-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preventive">Preventive</SelectItem>
                    <SelectItem value="corrective">Corrective</SelectItem>
                    <SelectItem value="predictive">Predictive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="create-priority">Priority *</Label>
                <Select 
                  value={createForm.priority?.toString() || '2'} 
                  onValueChange={(value) => setCreateForm(prev => ({ ...prev, priority: parseInt(value) }))}
                >
                  <SelectTrigger data-testid="select-create-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">High Priority</SelectItem>
                    <SelectItem value="2">Medium Priority</SelectItem>
                    <SelectItem value="3">Low Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="create-assigned">Assigned To</Label>
                <Input
                  id="create-assigned"
                  placeholder="Technician name..."
                  value={createForm.assignedTo || ''}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, assignedTo: e.target.value }))}
                  data-testid="input-create-assigned"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="create-description">Description</Label>
              <Textarea
                id="create-description"
                placeholder="Details about this maintenance..."
                value={createForm.description || ''}
                onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                data-testid="textarea-create-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSubmit} disabled={createMutation.isPending} data-testid="button-submit-create-schedule">
              {createMutation.isPending ? "Creating..." : "Create Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Schedule Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-2xl" data-testid="edit-schedule-modal">
          <DialogHeader>
            <DialogTitle>Edit Maintenance Schedule</DialogTitle>
            <DialogDescription>
              Update schedule for {selectedSchedule && getEquipmentName(selectedSchedule.equipmentId)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-equipment">Equipment *</Label>
              <Select 
                value={editForm.equipmentId || ''} 
                onValueChange={(value) => setEditForm(prev => ({ ...prev, equipmentId: value }))}
              >
                <SelectTrigger data-testid="select-edit-equipment">
                  <SelectValue placeholder="Select equipment" />
                </SelectTrigger>
                <SelectContent>
                  {equipment?.map((eq: any) => (
                    <SelectItem key={eq.id} value={eq.id}>
                      {eq.name || eq.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-date">Scheduled Date & Time *</Label>
                <Input
                  id="edit-date"
                  type="datetime-local"
                  value={
                    editForm.scheduledDate 
                      ? (typeof editForm.scheduledDate === 'string' 
                          ? editForm.scheduledDate 
                          : new Date(editForm.scheduledDate).toISOString().slice(0, 16))
                      : ''
                  }
                  onChange={(e) => setEditForm(prev => ({ ...prev, scheduledDate: e.target.value }))}
                  data-testid="input-edit-schedule-date"
                />
              </div>
              <div>
                <Label htmlFor="edit-type">Maintenance Type *</Label>
                <Select 
                  value={editForm.maintenanceType || 'preventive'} 
                  onValueChange={(value) => setEditForm(prev => ({ ...prev, maintenanceType: value }))}
                >
                  <SelectTrigger data-testid="select-edit-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preventive">Preventive</SelectItem>
                    <SelectItem value="corrective">Corrective</SelectItem>
                    <SelectItem value="predictive">Predictive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-priority">Priority *</Label>
                <Select 
                  value={editForm.priority?.toString() || '2'} 
                  onValueChange={(value) => setEditForm(prev => ({ ...prev, priority: parseInt(value) }))}
                >
                  <SelectTrigger data-testid="select-edit-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">High Priority</SelectItem>
                    <SelectItem value="2">Medium Priority</SelectItem>
                    <SelectItem value="3">Low Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-status">Status *</Label>
                <Select 
                  value={editForm.status || 'scheduled'} 
                  onValueChange={(value) => setEditForm(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger data-testid="select-edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-assigned">Assigned To</Label>
              <Input
                id="edit-assigned"
                placeholder="Technician name..."
                value={editForm.assignedTo || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, assignedTo: e.target.value }))}
                data-testid="input-edit-assigned"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                placeholder="Details about this maintenance..."
                value={editForm.description || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                data-testid="textarea-edit-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} disabled={updateMutation.isPending} data-testid="button-submit-edit-schedule">
              {updateMutation.isPending ? "Updating..." : "Update Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
