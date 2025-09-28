import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  Brain, 
  AlertTriangle, 
  TrendingUp, 
  Settings, 
  Activity,
  Database,
  Play,
  CheckCircle,
  Calendar,
  BarChart3
} from "lucide-react";

// Types (based on shared schema)
interface MlModel {
  id: string;
  orgId: string;
  name: string;
  version: string;
  modelType: string;
  targetEquipmentType?: string;
  status: string;
  deployedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface AnomalyDetection {
  id: number;
  orgId: string;
  equipmentId: string;
  sensorType: string;
  severity: string;
  detectionTimestamp: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

interface FailurePrediction {
  id: number;
  orgId: string;
  equipmentId: string;
  riskLevel: string;
  probability: number;
  estimatedTimeToFailure?: number;
  predictionTimestamp: string;
}

interface ThresholdOptimization {
  id: number;
  orgId: string;
  equipmentId: string;
  sensorType: string;
  optimizationTimestamp: string;
  appliedAt?: string;
  optimizationMethod?: string;
}

interface DigitalTwin {
  id: string;
  vesselId: string;
  twinType: string;
  configuration: any;
  lastUpdateTimestamp: string;
}

interface InsightSnapshot {
  id: string;
  orgId: string;
  scope: string;
  insights: any;
  timestamp: string;
}

// Form schemas
const mlModelSchema = z.object({
  name: z.string().min(1, "Name is required"),
  version: z.string().min(1, "Version is required"),
  modelType: z.string().min(1, "Model type is required"),
  targetEquipmentType: z.string().optional(),
  status: z.string().default("training"),
});

const anomalyDetectionSchema = z.object({
  equipmentId: z.string().min(1, "Equipment ID is required"),
  sensorType: z.string().min(1, "Sensor type is required"),
  severity: z.string().min(1, "Severity is required"),
});

const failurePredictionSchema = z.object({
  equipmentId: z.string().min(1, "Equipment ID is required"),
  riskLevel: z.string().min(1, "Risk level is required"),
  probability: z.number().min(0).max(1, "Probability must be between 0 and 1"),
  estimatedTimeToFailure: z.number().optional(),
});

const thresholdOptimizationSchema = z.object({
  equipmentId: z.string().min(1, "Equipment ID is required"),
  sensorType: z.string().min(1, "Sensor type is required"),
  optimizationMethod: z.string().optional(),
});

export default function AdvancedAnalytics() {
  const [selectedTab, setSelectedTab] = useState("ml-models");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const orgId = "default-org-id"; // In real app, get from auth context

  // ML Models queries and mutations
  const { data: mlModels = [], isLoading: isLoadingModels } = useQuery({
    queryKey: ["/api/analytics/ml-models", orgId],
    queryFn: () => fetch(`/api/analytics/ml-models?orgId=${orgId}`).then(res => res.json()),
  });

  // Anomaly Detections queries and mutations
  const { data: anomalyDetections = [], isLoading: isLoadingAnomalies } = useQuery({
    queryKey: ["/api/analytics/anomaly-detections", orgId],
    queryFn: () => fetch(`/api/analytics/anomaly-detections?orgId=${orgId}`).then(res => res.json()),
  });

  // Failure Predictions queries and mutations
  const { data: failurePredictions = [], isLoading: isLoadingPredictions } = useQuery({
    queryKey: ["/api/analytics/failure-predictions", orgId],
    queryFn: () => fetch(`/api/analytics/failure-predictions?orgId=${orgId}`).then(res => res.json()),
  });

  // Threshold Optimizations queries and mutations
  const { data: thresholdOptimizations = [], isLoading: isLoadingOptimizations } = useQuery({
    queryKey: ["/api/analytics/threshold-optimizations", orgId],
    queryFn: () => fetch(`/api/analytics/threshold-optimizations?orgId=${orgId}`).then(res => res.json()),
  });

  // Digital Twins queries
  const { data: digitalTwins = [], isLoading: isLoadingTwins } = useQuery({
    queryKey: ["/api/analytics/digital-twins", orgId],
    queryFn: () => fetch(`/api/analytics/digital-twins?orgId=${orgId}`).then(res => res.json()),
  });

  // Insight Snapshots queries
  const { data: insightSnapshots = [], isLoading: isLoadingInsights } = useQuery({
    queryKey: ["/api/analytics/insight-snapshots", orgId],
    queryFn: () => fetch(`/api/analytics/insight-snapshots?orgId=${orgId}`).then(res => res.json()),
  });

  // ML Model mutations
  const createMlModelMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/analytics/ml-models", {
      method: "POST",
      body: JSON.stringify({ ...data, orgId }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/ml-models", orgId] });
      setIsDialogOpen(false);
      toast({ title: "Success", description: "ML model created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create ML model", variant: "destructive" });
    },
  });

  const updateMlModelMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest(`/api/analytics/ml-models/${id}`, {
      method: "PUT",
      body: JSON.stringify({ ...data, orgId }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/ml-models", orgId] });
      setIsDialogOpen(false);
      setEditingItem(null);
      toast({ title: "Success", description: "ML model updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update ML model", variant: "destructive" });
    },
  });

  const deleteMlModelMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/analytics/ml-models/${id}?orgId=${orgId}`, {
      method: "DELETE",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/ml-models", orgId] });
      toast({ title: "Success", description: "ML model deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete ML model", variant: "destructive" });
    },
  });

  // Anomaly Detection mutations
  const acknowledgeAnomalyMutation = useMutation({
    mutationFn: ({ id, acknowledgedBy }: { id: number; acknowledgedBy: string }) => 
      apiRequest(`/api/analytics/anomaly-detections/${id}/acknowledge`, {
        method: "PATCH",
        body: JSON.stringify({ acknowledgedBy, orgId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/anomaly-detections", orgId] });
      toast({ title: "Success", description: "Anomaly acknowledged successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to acknowledge anomaly", variant: "destructive" });
    },
  });

  // Threshold Optimization mutations
  const applyOptimizationMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/analytics/threshold-optimizations/${id}/apply`, {
      method: "PATCH",
      body: JSON.stringify({ orgId }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/threshold-optimizations", orgId] });
      toast({ title: "Success", description: "Threshold optimization applied successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to apply threshold optimization", variant: "destructive" });
    },
  });

  // Forms
  const mlModelForm = useForm({
    resolver: zodResolver(mlModelSchema),
    defaultValues: editingItem || {
      name: "",
      version: "",
      modelType: "",
      targetEquipmentType: "",
      status: "training",
    },
  });

  // Reset form when editing item changes
  if (editingItem && editingItem !== mlModelForm.getValues()) {
    mlModelForm.reset(editingItem);
  }

  const onSubmitMlModel = (data: any) => {
    if (editingItem) {
      updateMlModelMutation.mutate({ ...data, id: editingItem.id });
    } else {
      createMlModelMutation.mutate(data);
    }
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this ML model?")) {
      deleteMlModelMutation.mutate(id);
    }
  };

  const handleAcknowledgeAnomaly = (id: number) => {
    const acknowledgedBy = prompt("Enter your name to acknowledge this anomaly:");
    if (acknowledgedBy) {
      acknowledgeAnomalyMutation.mutate({ id, acknowledgedBy });
    }
  };

  const handleApplyOptimization = (id: number) => {
    if (confirm("Are you sure you want to apply this threshold optimization?")) {
      applyOptimizationMutation.mutate(id);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "destructive";
      case "warning": return "default";
      case "info": return "secondary";
      default: return "outline";
    }
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "outline";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Brain className="h-8 w-8" />
              Advanced Analytics
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage ML models, monitor anomalies, analyze predictions, and optimize system performance
            </p>
          </div>

          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="ml-models" data-testid="tab-ml-models">
                <Brain className="h-4 w-4 mr-2" />
                ML Models
              </TabsTrigger>
              <TabsTrigger value="anomalies" data-testid="tab-anomalies">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Anomalies
              </TabsTrigger>
              <TabsTrigger value="predictions" data-testid="tab-predictions">
                <TrendingUp className="h-4 w-4 mr-2" />
                Predictions
              </TabsTrigger>
              <TabsTrigger value="optimizations" data-testid="tab-optimizations">
                <Settings className="h-4 w-4 mr-2" />
                Optimizations
              </TabsTrigger>
              <TabsTrigger value="digital-twins" data-testid="tab-digital-twins">
                <Activity className="h-4 w-4 mr-2" />
                Digital Twins
              </TabsTrigger>
              <TabsTrigger value="insights" data-testid="tab-insights">
                <BarChart3 className="h-4 w-4 mr-2" />
                Insights
              </TabsTrigger>
            </TabsList>

            {/* ML Models Tab */}
            <TabsContent value="ml-models" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>ML Models</CardTitle>
                      <CardDescription>
                        Manage machine learning models for predictive maintenance and analytics
                      </CardDescription>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button data-testid="button-create-ml-model" onClick={() => {
                          setEditingItem(null);
                          mlModelForm.reset({
                            name: "",
                            version: "",
                            modelType: "",
                            targetEquipmentType: "",
                            status: "training",
                          });
                        }}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Model
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>
                            {editingItem ? "Edit ML Model" : "Create New ML Model"}
                          </DialogTitle>
                          <DialogDescription>
                            {editingItem ? "Update the ML model details" : "Configure a new machine learning model"}
                          </DialogDescription>
                        </DialogHeader>
                        <Form {...mlModelForm}>
                          <form onSubmit={mlModelForm.handleSubmit(onSubmitMlModel)} className="space-y-4">
                            <FormField
                              control={mlModelForm.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Model Name</FormLabel>
                                  <FormControl>
                                    <Input data-testid="input-model-name" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={mlModelForm.control}
                              name="version"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Version</FormLabel>
                                  <FormControl>
                                    <Input data-testid="input-model-version" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={mlModelForm.control}
                              name="modelType"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Model Type</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-model-type">
                                        <SelectValue placeholder="Select model type" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="anomaly_detection">Anomaly Detection</SelectItem>
                                      <SelectItem value="failure_prediction">Failure Prediction</SelectItem>
                                      <SelectItem value="threshold_optimization">Threshold Optimization</SelectItem>
                                      <SelectItem value="predictive_maintenance">Predictive Maintenance</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={mlModelForm.control}
                              name="targetEquipmentType"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Target Equipment Type (Optional)</FormLabel>
                                  <FormControl>
                                    <Input data-testid="input-equipment-type" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={mlModelForm.control}
                              name="status"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Status</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-model-status">
                                        <SelectValue placeholder="Select status" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="training">Training</SelectItem>
                                      <SelectItem value="active">Active</SelectItem>
                                      <SelectItem value="deprecated">Deprecated</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <DialogFooter>
                              <Button type="submit" data-testid="button-save-model" disabled={createMlModelMutation.isPending || updateMlModelMutation.isPending}>
                                {editingItem ? "Update" : "Create"} Model
                              </Button>
                            </DialogFooter>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingModels ? (
                    <div className="text-center py-8">Loading ML models...</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Version</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Equipment</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mlModels.map((model: MlModel) => (
                          <TableRow key={model.id} data-testid={`row-model-${model.id}`}>
                            <TableCell className="font-medium">{model.name}</TableCell>
                            <TableCell>{model.version}</TableCell>
                            <TableCell>{model.modelType}</TableCell>
                            <TableCell>{model.targetEquipmentType || "All"}</TableCell>
                            <TableCell>
                              <Badge variant={model.status === "active" ? "default" : "secondary"}>
                                {model.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDate(model.createdAt)}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  data-testid={`button-edit-${model.id}`}
                                  onClick={() => handleEdit(model)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  data-testid={`button-delete-${model.id}`}
                                  onClick={() => handleDelete(model.id)}
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
            </TabsContent>

            {/* Anomaly Detections Tab */}
            <TabsContent value="anomalies" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Anomaly Detections</CardTitle>
                  <CardDescription>
                    Monitor and manage detected anomalies in equipment behavior
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingAnomalies ? (
                    <div className="text-center py-8">Loading anomaly detections...</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Equipment ID</TableHead>
                          <TableHead>Sensor Type</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>Detected</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {anomalyDetections.map((detection: AnomalyDetection) => (
                          <TableRow key={detection.id} data-testid={`row-anomaly-${detection.id}`}>
                            <TableCell className="font-medium">{detection.equipmentId}</TableCell>
                            <TableCell>{detection.sensorType}</TableCell>
                            <TableCell>
                              <Badge variant={getSeverityColor(detection.severity)}>
                                {detection.severity}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDate(detection.detectionTimestamp)}</TableCell>
                            <TableCell>
                              {detection.acknowledgedBy ? (
                                <Badge variant="outline">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Acknowledged
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Pending</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {!detection.acknowledgedBy && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  data-testid={`button-acknowledge-${detection.id}`}
                                  onClick={() => handleAcknowledgeAnomaly(detection.id)}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Acknowledge
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Failure Predictions Tab */}
            <TabsContent value="predictions" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Failure Predictions</CardTitle>
                  <CardDescription>
                    View equipment failure predictions and risk assessments
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingPredictions ? (
                    <div className="text-center py-8">Loading failure predictions...</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Equipment ID</TableHead>
                          <TableHead>Risk Level</TableHead>
                          <TableHead>Probability</TableHead>
                          <TableHead>Time to Failure</TableHead>
                          <TableHead>Predicted</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {failurePredictions.map((prediction: FailurePrediction) => (
                          <TableRow key={prediction.id} data-testid={`row-prediction-${prediction.id}`}>
                            <TableCell className="font-medium">{prediction.equipmentId}</TableCell>
                            <TableCell>
                              <Badge variant={getRiskLevelColor(prediction.riskLevel)}>
                                {prediction.riskLevel}
                              </Badge>
                            </TableCell>
                            <TableCell>{(prediction.probability * 100).toFixed(1)}%</TableCell>
                            <TableCell>
                              {prediction.estimatedTimeToFailure 
                                ? `${prediction.estimatedTimeToFailure} days`
                                : "Unknown"
                              }
                            </TableCell>
                            <TableCell>{formatDate(prediction.predictionTimestamp)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Threshold Optimizations Tab */}
            <TabsContent value="optimizations" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Threshold Optimizations</CardTitle>
                  <CardDescription>
                    Manage and apply automated threshold optimizations for better performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingOptimizations ? (
                    <div className="text-center py-8">Loading threshold optimizations...</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Equipment ID</TableHead>
                          <TableHead>Sensor Type</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Optimized</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {thresholdOptimizations.map((optimization: ThresholdOptimization) => (
                          <TableRow key={optimization.id} data-testid={`row-optimization-${optimization.id}`}>
                            <TableCell className="font-medium">{optimization.equipmentId}</TableCell>
                            <TableCell>{optimization.sensorType}</TableCell>
                            <TableCell>{optimization.optimizationMethod || "Auto"}</TableCell>
                            <TableCell>{formatDate(optimization.optimizationTimestamp)}</TableCell>
                            <TableCell>
                              {optimization.appliedAt ? (
                                <Badge variant="default">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Applied
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Pending</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {!optimization.appliedAt && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  data-testid={`button-apply-${optimization.id}`}
                                  onClick={() => handleApplyOptimization(optimization.id)}
                                >
                                  <Play className="h-4 w-4 mr-2" />
                                  Apply
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Digital Twins Tab */}
            <TabsContent value="digital-twins" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Digital Twins</CardTitle>
                  <CardDescription>
                    Monitor and manage digital twin models of your vessels and equipment
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingTwins ? (
                    <div className="text-center py-8">Loading digital twins...</div>
                  ) : digitalTwins.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No digital twins found. Digital twins are automatically created for vessels with sufficient telemetry data.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Twin ID</TableHead>
                          <TableHead>Vessel ID</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Last Updated</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {digitalTwins.map((twin: DigitalTwin) => (
                          <TableRow key={twin.id} data-testid={`row-twin-${twin.id}`}>
                            <TableCell className="font-medium">{twin.id}</TableCell>
                            <TableCell>{twin.vesselId}</TableCell>
                            <TableCell>{twin.twinType}</TableCell>
                            <TableCell>{formatDate(twin.lastUpdateTimestamp)}</TableCell>
                            <TableCell>
                              <Button size="sm" variant="outline" data-testid={`button-view-twin-${twin.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Insights Tab */}
            <TabsContent value="insights" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Analytics Insights</CardTitle>
                  <CardDescription>
                    View aggregated insights and analytics snapshots from your systems
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingInsights ? (
                    <div className="text-center py-8">Loading insights...</div>
                  ) : insightSnapshots.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No insights available. Insights are generated automatically based on your system data.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Scope</TableHead>
                          <TableHead>Generated</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {insightSnapshots.map((snapshot: InsightSnapshot) => (
                          <TableRow key={snapshot.id} data-testid={`row-insight-${snapshot.id}`}>
                            <TableCell className="font-medium">{snapshot.scope}</TableCell>
                            <TableCell>{formatDate(snapshot.timestamp)}</TableCell>
                            <TableCell>
                              <Button size="sm" variant="outline" data-testid={`button-view-insight-${snapshot.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Button>
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
      </div>
    </div>
  );
}