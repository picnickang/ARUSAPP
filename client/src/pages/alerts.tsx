import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCreateMutation, useUpdateMutation, useDeleteMutation, useCustomMutation } from "@/hooks/useCrudMutations";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Button 
} from "@/components/ui/button";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { 
  Input 
} from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Badge 
} from "@/components/ui/badge";
import { 
  Separator 
} from "@/components/ui/separator";
import { 
  AlertTriangle, 
  Bell, 
  BellOff, 
  CheckCircle, 
  Plus, 
  Settings,
  Trash2
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import type { AlertConfiguration, AlertNotification } from "@shared/schema";

const alertConfigSchema = z.object({
  equipmentId: z.string().min(1, "Equipment ID is required"),
  sensorType: z.string().min(1, "Sensor type is required"),
  warningThreshold: z.number().min(0, "Warning threshold must be positive").optional(),
  criticalThreshold: z.number().min(0, "Critical threshold must be positive").optional(),
  enabled: z.boolean(),
  notifyEmail: z.boolean(),
  notifyInApp: z.boolean()
});

type AlertConfigFormData = z.infer<typeof alertConfigSchema>;

export default function AlertsPage() {
  const { toast } = useToast();
  
  // WebSocket connection for real-time updates
  const { isConnected, latestAlert, lastMessage, subscribe, unsubscribe } = useWebSocket({
    autoConnect: true
  });
  const [selectedTab, setSelectedTab] = useState<"configurations" | "notifications">("configurations");
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<AlertConfiguration | null>(null);

  // Fetch alert configurations
  const { data: configurations = [], isLoading: configLoading } = useQuery<AlertConfiguration[]>({
    queryKey: ["/api/alerts/configurations"],
    refetchInterval: 30000
  });

  // Fetch alert notifications
  const { data: notifications = [], isLoading: notificationLoading } = useQuery<AlertNotification[]>({
    queryKey: ["/api/alerts/notifications"],
    refetchInterval: 10000
  });

  // Fetch equipment registry for name mapping
  const { data: equipmentRegistry = [] } = useQuery({
    queryKey: ["/api/equipment"],
    refetchInterval: 30000
  });

  // Fetch equipment health for name mapping
  const { data: equipmentHealth = [] } = useQuery({
    queryKey: ["/api/equipment/health"],
    refetchInterval: 30000
  });

  // Helper function to get equipment name by ID
  const getEquipmentName = (equipmentId: string | null | undefined): string => {
    if (!equipmentId) return "Unknown";
    
    // First check equipment health data (has name field)
    const healthItem = equipmentHealth?.find((eq: any) => eq.id === equipmentId);
    if (healthItem?.name) return healthItem.name;
    
    // Then check equipment registry
    const equipment = equipmentRegistry?.find((eq: any) => eq.id === equipmentId);
    if (equipment?.name) return equipment.name;
    
    // Fallback to ID
    return equipmentId;
  };

  // Form for creating/editing alert configurations
  const form = useForm<AlertConfigFormData>({
    resolver: zodResolver(alertConfigSchema),
    defaultValues: {
      equipmentId: "",
      sensorType: "",
      warningThreshold: 0,
      criticalThreshold: 0,
      enabled: true,
      notifyEmail: false,
      notifyInApp: true
    }
  });

  // Alert configuration mutations using reusable hooks
  const createConfigMutation = useCreateMutation<AlertConfigFormData>('/api/alerts/configurations', {
    successMessage: "Alert configuration created",
    successDescription: "The alert configuration has been created successfully.",
    onSuccess: () => {
      setIsConfigDialogOpen(false);
      form.reset();
    },
  });

  const updateConfigMutation = useUpdateMutation<Partial<AlertConfigFormData>>('/api/alerts/configurations', {
    successMessage: "Alert configuration updated",
    successDescription: "The alert configuration has been updated successfully.",
    onSuccess: () => {
      setEditingConfig(null);
      setIsConfigDialogOpen(false);
      form.reset();
    },
  });

  const deleteConfigMutation = useDeleteMutation('/api/alerts/configurations', {
    // Silent delete - no toast
  });

  // Custom mutations for non-standard operations
  const acknowledgeAlertMutation = useCustomMutation({
    mutationFn: async ({ id, acknowledgedBy }: { id: string; acknowledgedBy: string }) => {
      const response = await apiRequest("PATCH", `/api/alerts/notifications/${id}/acknowledge`, { acknowledgedBy });
      return response.json();
    },
    invalidateKeys: ['/api/alerts/notifications'],
    // Silent - no toast
  });

  const clearAllAlertsMutation = useCustomMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/alerts/all");
      return response.json();
    },
    invalidateKeys: ['/api/alerts/notifications'],
    successMessage: "All alerts cleared",
    successDescription: "All alert notifications have been successfully cleared.",
  });

  const handleSubmit = (data: AlertConfigFormData) => {
    if (editingConfig) {
      updateConfigMutation.mutate({ id: editingConfig.id, data });
    } else {
      createConfigMutation.mutate(data);
    }
  };

  const handleEdit = (config: AlertConfiguration) => {
    setEditingConfig(config);
    form.reset({
      equipmentId: config.equipmentId,
      sensorType: config.sensorType,
      warningThreshold: config.warningThreshold || 0,
      criticalThreshold: config.criticalThreshold || 0,
      enabled: config.enabled || false,
      notifyEmail: config.notifyEmail || false,
      notifyInApp: config.notifyInApp || true
    });
    setIsConfigDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this alert configuration?")) {
      deleteConfigMutation.mutate(id);
    }
  };

  // Subscribe to alerts channel for real-time notifications
  useEffect(() => {
    if (isConnected) {
      subscribe('alerts');
    }
    
    return () => {
      unsubscribe('alerts');
    };
  }, [isConnected, subscribe, unsubscribe]);

  // Handle new alert notifications and real-time cache updates
  useEffect(() => {
    if (latestAlert) {
      // Update the notifications cache with new alert
      queryClient.setQueryData<AlertNotification[]>(['/api/alerts/notifications'], (oldData) => {
        if (!oldData) return [latestAlert];
        
        // Check if alert already exists to avoid duplicates
        const exists = oldData.some(alert => alert.id === latestAlert.id);
        if (exists) return oldData;
        
        // Prepend new alert to the list
        return [latestAlert, ...oldData];
      });
      
      // Show toast notification for new alerts
      if (!latestAlert.acknowledged) {
        toast({
          title: `${latestAlert.alertType.toUpperCase()} Alert`,
          description: `${getEquipmentName(latestAlert.equipmentId)}: ${latestAlert.message}`,
          variant: latestAlert.alertType === 'critical' ? 'destructive' : 'default',
        });
      }
    }
  }, [latestAlert, toast]);

  // Handle alert acknowledgment updates via WebSocket
  useEffect(() => {
    if (lastMessage && lastMessage.type === 'alert_acknowledged') {
      const { alertId, acknowledgedBy } = lastMessage.data;
      
      // Update the specific alert in the cache
      queryClient.setQueryData<AlertNotification[]>(['/api/alerts/notifications'], (oldData) => {
        if (!oldData) return oldData;
        
        return oldData.map(alert => 
          alert.id === alertId 
            ? { ...alert, acknowledged: true, acknowledgedBy, acknowledgedAt: lastMessage.timestamp }
            : alert
        );
      });
    }
  }, [lastMessage]);

  const handleAcknowledge = (notification: AlertNotification) => {
    acknowledgeAlertMutation.mutate({
      id: notification.id,
      acknowledgedBy: "Current User" // In a real app, this would come from auth context
    });
  };

  const handleClearAllAlerts = () => {
    if (confirm("Are you sure you want to clear all alert notifications? This action cannot be undone.")) {
      clearAllAlertsMutation.mutate();
    }
  };

  const getSeverityColor = (alertType: string) => {
    switch (alertType) {
      case "critical": return "bg-red-500";
      case "warning": return "bg-yellow-500";
      default: return "bg-blue-500";
    }
  };

  const getStatusIcon = (alertType: string) => {
    switch (alertType) {
      case "critical": return <AlertTriangle className="h-4 w-4" />;
      case "warning": return <AlertTriangle className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:justify-between md:items-center md:space-y-0">
        <div className="min-w-0">
          <h1 className="text-xl md:text-3xl font-bold truncate">Alert Management</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Configure threshold alerts and manage notifications for your equipment
          </p>
        </div>
        <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="min-h-[44px] touch-manipulation flex-shrink-0"
              data-testid="button-add-alert"
            >
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Add Alert</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md mx-4 md:mx-0">
            <DialogHeader>
              <DialogTitle>
                {editingConfig ? "Edit Alert Configuration" : "Create Alert Configuration"}
              </DialogTitle>
              <DialogDescription>
                Set up threshold-based alerts for equipment monitoring.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="equipmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Equipment</FormLabel>
                      <Select 
                        value={field.value} 
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-equipment-id">
                            <SelectValue placeholder="Select equipment" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {equipmentRegistry
                            .filter((eq: any) => eq.id && eq.id.trim() !== '')
                            .map((eq: any) => (
                              <SelectItem key={eq.id} value={eq.id}>
                                {getEquipmentName(eq.id)}
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
                  name="sensorType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sensor Type</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., temperature, pressure, vibration"
                          data-testid="input-sensor-type"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="warningThreshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Warning Threshold</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Warning level threshold"
                          data-testid="input-warning-threshold"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="criticalThreshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Critical Threshold</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Critical level threshold"
                          data-testid="input-critical-threshold"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Enable Alert
                        </FormLabel>
                        <FormDescription>
                          Enable this alert configuration to start monitoring
                        </FormDescription>
                      </div>
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="accent-primary"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notifyInApp"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          In-App Notifications
                        </FormLabel>
                        <FormDescription>
                          Show notifications in the application
                        </FormDescription>
                      </div>
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="accent-primary"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notifyEmail"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Email Notifications
                        </FormLabel>
                        <FormDescription>
                          Send notifications via email
                        </FormDescription>
                      </div>
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="accent-primary"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsConfigDialogOpen(false);
                      setEditingConfig(null);
                      form.reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createConfigMutation.isPending || updateConfigMutation.isPending}
                    data-testid="button-save-alert"
                  >
                    {createConfigMutation.isPending || updateConfigMutation.isPending ? "Saving..." : (editingConfig ? "Update" : "Create")}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-2 md:space-x-4 border-b overflow-x-auto">
        <button
          onClick={() => setSelectedTab("configurations")}
          className={`pb-2 px-2 md:px-1 whitespace-nowrap min-h-[44px] touch-manipulation flex items-center ${
            selectedTab === "configurations"
              ? "border-b-2 border-primary text-primary font-medium"
              : "text-muted-foreground"
          }`}
          data-testid="tab-configurations"
        >
          <Settings className="h-4 w-4 mr-1 md:mr-2 flex-shrink-0" />
          <span className="text-sm md:text-base">
            <span className="hidden sm:inline">Configurations</span>
            <span className="sm:hidden">Config</span>
            <span className="ml-1">({configurations.length})</span>
          </span>
        </button>
        <button
          onClick={() => setSelectedTab("notifications")}
          className={`pb-2 px-2 md:px-1 whitespace-nowrap min-h-[44px] touch-manipulation flex items-center ${
            selectedTab === "notifications"
              ? "border-b-2 border-primary text-primary font-medium"
              : "text-muted-foreground"
          }`}
          data-testid="tab-notifications"
        >
          <Bell className="h-4 w-4 mr-1 md:mr-2 flex-shrink-0" />
          <span className="text-sm md:text-base">
            <span className="hidden sm:inline">Notifications</span>
            <span className="sm:hidden">Alerts</span>
            <span className="ml-1">({notifications.filter((n: AlertNotification) => !n.acknowledged).length})</span>
          </span>
        </button>
      </div>

      {/* Alert Configurations Tab */}
      {selectedTab === "configurations" && (
        <div className="space-y-3 md:space-y-4">
          {configLoading ? (
            <div className="text-center py-8">Loading configurations...</div>
          ) : configurations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Settings className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Alert Configurations</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first alert configuration to start monitoring equipment thresholds.
                </p>
                <Button onClick={() => setIsConfigDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Alert Configuration
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {configurations.map((config: AlertConfiguration) => (
                <Card key={config.id} data-testid={`card-config-${config.id}`}>
                  <CardHeader className="flex flex-col space-y-3 md:flex-row md:items-center md:justify-between md:space-y-0 pb-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base md:text-lg truncate">
                        {getEquipmentName(config.equipmentId)} - {config.sensorType}
                      </CardTitle>
                      <CardDescription className="text-xs md:text-sm">
                        Warning: {config.warningThreshold || 'None'} | Critical: {config.criticalThreshold || 'None'}
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2 flex-wrap gap-1">
                      <Badge 
                        variant="outline" 
                        className="bg-blue-500 text-white text-xs"
                      >
                        CONFIG
                      </Badge>
                      {config.enabled ? (
                        <Badge variant="outline" className="bg-green-500 text-white text-xs">
                          <Bell className="h-3 w-3 mr-1" />
                          Enabled
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-500 text-white text-xs">
                          <BellOff className="h-3 w-3 mr-1" />
                          Disabled
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col space-y-3 md:flex-row md:justify-between md:items-center md:space-y-0">
                      <div className="text-xs md:text-sm text-muted-foreground">
                        Created {config.createdAt ? formatDistanceToNow(new Date(config.createdAt)) : 'Unknown'} ago
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="min-h-[44px] touch-manipulation flex-1 md:flex-initial"
                          onClick={() => handleEdit(config)}
                          data-testid={`button-edit-${config.id}`}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="min-h-[44px] touch-manipulation"
                          onClick={() => handleDelete(config.id)}
                          data-testid={`button-delete-${config.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Alert Notifications Tab */}
      {selectedTab === "notifications" && (
        <div className="space-y-3 md:space-y-4">
          {/* Clear All Button - shown only when there are notifications */}
          {notifications.length > 0 && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:bg-destructive hover:text-destructive-foreground min-h-[44px] touch-manipulation"
                onClick={handleClearAllAlerts}
                disabled={clearAllAlertsMutation.isPending}
                data-testid="button-clear-all-alerts"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {clearAllAlertsMutation.isPending ? "Clearing..." : "Clear All"}
              </Button>
            </div>
          )}
          
          {notificationLoading ? (
            <div className="text-center py-8">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Notifications</h3>
                <p className="text-muted-foreground text-center">
                  Alert notifications will appear here when thresholds are exceeded.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {notifications.map((notification: AlertNotification) => (
                <Card 
                  key={notification.id} 
                  className={notification.acknowledged ? "opacity-60" : ""}
                  data-testid={`card-notification-${notification.id}`}
                >
                  <CardHeader className="flex flex-col space-y-3 md:flex-row md:items-center md:justify-between md:space-y-0 pb-2">
                    <div className="flex items-center space-x-2 md:space-x-3 min-w-0 flex-1">
                      <div className="flex-shrink-0">
                        {getStatusIcon(notification.alertType)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base md:text-lg truncate">
                          {getEquipmentName(notification.equipmentId)} - {notification.sensorType}
                        </CardTitle>
                        <CardDescription className="text-xs md:text-sm">
                          {notification.message}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 flex-wrap gap-1">
                      <Badge 
                        variant="outline" 
                        className={`${getSeverityColor(notification.alertType)} text-white text-xs`}
                      >
                        {notification.alertType.toUpperCase()}
                      </Badge>
                      {notification.acknowledged ? (
                        <Badge variant="outline" className="bg-green-500 text-white text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          <span className="hidden sm:inline">Acknowledged</span>
                          <span className="sm:hidden">ACK</span>
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          Active
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col space-y-3 md:flex-row md:justify-between md:items-center md:space-y-0">
                      <div className="text-xs md:text-sm text-muted-foreground">
                        {notification.acknowledged ? (
                          <span>
                            Acknowledged {notification.acknowledgedAt ? formatDistanceToNow(new Date(notification.acknowledgedAt)) : 'recently'} ago
                            by {notification.acknowledgedBy}
                          </span>
                        ) : (
                          <span>
                            Created {notification.createdAt ? formatDistanceToNow(new Date(notification.createdAt)) : 'recently'} ago
                          </span>
                        )}
                      </div>
                      {!notification.acknowledged && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="min-h-[44px] touch-manipulation w-full md:w-auto"
                          onClick={() => handleAcknowledge(notification)}
                          disabled={acknowledgeAlertMutation.isPending}
                          data-testid={`button-acknowledge-${notification.id}`}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Acknowledge
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}