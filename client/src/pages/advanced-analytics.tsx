import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { useCreateMutation, useUpdateMutation, useDeleteMutation, useCustomMutation } from "@/hooks/useCrudMutations";
import { QuickActions } from "@/components/ui/contextual-actions";
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
  anomalyScore?: number;
  anomalyType?: string;
  detectedValue?: number;
  expectedValue?: number;
  deviation?: number;
  contributingFactors?: string[];
  recommendedActions?: string[];
  metadata?: any;
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
  name?: string;
  specifications?: any;
  currentState?: any;
  lastUpdate: string;
  validationStatus?: string;
  accuracy?: number;
  metadata?: any;
  lastUpdateTimestamp?: string;
}

interface InsightSnapshot {
  id: string;
  orgId: string;
  scope: string;
  createdAt?: string;
  kpi?: {
    fleet?: {
      vessels: number;
      signalsMapped: number;
      signalsDiscovered: number;
      dq7d: number;
      latestGapVessels: string[];
    };
    perVessel?: Record<string, any>;
  };
  risks?: any;
  insights?: any;
  timestamp?: string;
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

function MLPredictionGenerator() {
  const { toast } = useToast();
  const [selectedEquipment, setSelectedEquipment] = useState<string>("");
  const [predictionResult, setPredictionResult] = useState<any>(null);

  const { data: equipment = [] } = useQuery<any[]>({
    queryKey: ["/api/equipment"],
  });

  const generatePrediction = useCustomMutation({
    mutationFn: async (equipmentId: string) => {
      return await apiRequest("POST", "/api/ml/predict/failure", { equipmentId });
    },
    successMessage: (data) => `Risk: ${data.riskLevel} (${(data.failureProbability * 100).toFixed(1)}% probability)`,
    errorMessage: (error: any) => error.message || "Failed to generate prediction",
    onSuccess: (data) => {
      setPredictionResult(data);
    },
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ml-equipment">Select Equipment</Label>
          <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
            <SelectTrigger id="ml-equipment" data-testid="select-ml-equipment">
              <SelectValue placeholder="Choose equipment..." />
            </SelectTrigger>
            <SelectContent>
              {equipment.map((eq: any) => (
                <SelectItem key={eq.id} value={eq.id} data-testid={`option-equipment-${eq.id}`}>
                  {eq.name} ({eq.type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end">
          <Button
            onClick={() => selectedEquipment && generatePrediction.mutate(selectedEquipment)}
            disabled={!selectedEquipment || generatePrediction.isPending}
            className="w-full"
            data-testid="button-generate-ml-prediction"
          >
            {generatePrediction.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Generate Prediction
              </>
            )}
          </Button>
        </div>
      </div>

      {predictionResult && (
        <Alert className={
          predictionResult.riskLevel === 'high' ? 'border-red-500' :
          predictionResult.riskLevel === 'medium' ? 'border-yellow-500' :
          'border-green-500'
        } data-testid="alert-prediction-result">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <div className="font-semibold">
                Risk Level: {predictionResult.riskLevel}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Failure Probability:</span>
                  <span className="ml-2 font-medium" data-testid="text-failure-prob">
                    {(predictionResult.failureProbability * 100).toFixed(1)}%
                  </span>
                </div>
                {predictionResult.estimatedDaysToFailure && (
                  <div>
                    <span className="text-muted-foreground">Est. Days to Failure:</span>
                    <span className="ml-2 font-medium" data-testid="text-days-to-failure">
                      {predictionResult.estimatedDaysToFailure}
                    </span>
                  </div>
                )}
              </div>
              {predictionResult.contributingFactors && predictionResult.contributingFactors.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-1">Contributing Factors:</div>
                  <ul className="text-sm space-y-1">
                    {predictionResult.contributingFactors.map((factor: any, i: number) => (
                      <li key={i} data-testid={`text-factor-${i}`}>
                        • {factor.factor}: {factor.severity} ({(factor.weight * 100).toFixed(0)}% weight)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

const formatDate = (dateString: string | undefined | null) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
};

function JsonDataRenderer({ data, level = 0 }: { data: any; level?: number }) {
  if (data === null || data === undefined) {
    return <span className="text-muted-foreground italic">N/A</span>;
  }

  if (typeof data === 'boolean') {
    return <Badge variant={data ? 'default' : 'secondary'}>{data ? 'Yes' : 'No'}</Badge>;
  }

  if (typeof data === 'number') {
    return <span className="font-mono">{data}</span>;
  }

  if (typeof data === 'string') {
    if (data.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
      return <span className="text-sm">{formatDate(data)}</span>;
    }
    return <span>{data}</span>;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <span className="text-muted-foreground italic">Empty</span>;
    }
    return (
      <div className="space-y-1">
        {data.map((item, index) => (
          <div key={index} className="flex items-start gap-2">
            <span className="text-muted-foreground">•</span>
            <div className="flex-1">
              <JsonDataRenderer data={item} level={level + 1} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data);
    if (entries.length === 0) {
      return <span className="text-muted-foreground italic">Empty</span>;
    }
    return (
      <div className={level === 0 ? "space-y-3" : "space-y-2"}>
        {entries.map(([key, value]) => (
          <div key={key} className={level === 0 ? "border-l-2 border-border pl-3" : ""}>
            <div className="flex items-start gap-2">
              <Label className="text-xs font-medium text-muted-foreground min-w-[120px] capitalize">
                {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}:
              </Label>
              <div className="flex-1">
                <JsonDataRenderer data={value} level={level + 1} />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return <span>{String(data)}</span>;
}

export default function AdvancedAnalytics() {
  const [selectedTab, setSelectedTab] = useState("ml-models");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyDetection | null>(null);
  const [selectedDigitalTwin, setSelectedDigitalTwin] = useState<DigitalTwin | null>(null);
  const [selectedInsight, setSelectedInsight] = useState<InsightSnapshot | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const orgId = "default-org-id"; // In real app, get from auth context

  // Fetch equipment and vessels for name lookups
  const { data: equipment = [] } = useQuery<any[]>({
    queryKey: ["/api/equipment"],
  });

  const { data: vessels = [] } = useQuery<any[]>({
    queryKey: ["/api/vessels"],
  });

  // Create lookup maps for names
  const equipmentMap = new Map(equipment.map((eq: any) => [eq.id, eq.name || eq.id]));
  const vesselMap = new Map(vessels.map((v: any) => [v.id, v.name]));

  // Helper function to get equipment name
  const getEquipmentName = (equipmentId: string) => {
    return equipmentMap.get(equipmentId) || equipmentId;
  };

  // Helper function to get vessel name
  const getVesselName = (vesselId: string) => {
    return vesselMap.get(vesselId) || vesselId;
  };

  // ML Models queries and mutations
  const { data: mlModels = [], isLoading: isLoadingModels } = useQuery({
    queryKey: ["/api/analytics/ml-models", orgId],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/analytics/ml-models?orgId=${orgId}`);
        if (!res.ok) {
          return [];
        }
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Error fetching ML models:", error);
        return [];
      }
    },
  });

  // Anomaly Detections queries and mutations
  const { data: anomalyDetections = [], isLoading: isLoadingAnomalies } = useQuery({
    queryKey: ["/api/analytics/anomaly-detections", orgId],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/analytics/anomaly-detections?orgId=${orgId}`);
        if (!res.ok) {
          return [];
        }
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Error fetching anomaly detections:", error);
        return [];
      }
    },
  });

  // Failure Predictions queries and mutations
  const { data: failurePredictions = [], isLoading: isLoadingPredictions } = useQuery({
    queryKey: ["/api/analytics/failure-predictions", orgId],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/analytics/failure-predictions?orgId=${orgId}`);
        if (!res.ok) {
          return [];
        }
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Error fetching failure predictions:", error);
        return [];
      }
    },
  });

  // Threshold Optimizations queries and mutations
  const { data: thresholdOptimizations = [], isLoading: isLoadingOptimizations } = useQuery({
    queryKey: ["/api/analytics/threshold-optimizations", orgId],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/analytics/threshold-optimizations?orgId=${orgId}`);
        if (!res.ok) {
          return [];
        }
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Error fetching threshold optimizations:", error);
        return [];
      }
    },
  });

  // Digital Twins queries
  const { data: digitalTwins = [], isLoading: isLoadingTwins } = useQuery({
    queryKey: ["/api/analytics/digital-twins", orgId],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/analytics/digital-twins?orgId=${orgId}`);
        if (!res.ok) {
          return [];
        }
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Error fetching digital twins:", error);
        return [];
      }
    },
  });

  // Insight Snapshots queries
  const { data: insightSnapshots = [], isLoading: isLoadingInsights } = useQuery({
    queryKey: ["/api/analytics/insight-snapshots", orgId],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/analytics/insight-snapshots?orgId=${orgId}`);
        if (!res.ok) {
          return [];
        }
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Error fetching insight snapshots:", error);
        return [];
      }
    },
  });

  // ML Model mutations
  const createMlModelMutation = useCreateMutation({
    endpoint: "/api/analytics/ml-models",
    invalidateKeys: [["/api/analytics/ml-models", orgId]],
    successMessage: "ML model created successfully",
    errorMessage: "Failed to create ML model",
    onSuccess: () => {
      setIsDialogOpen(false);
    },
    transformData: (data: any) => ({ ...data, orgId }),
  });

  const updateMlModelMutation = useUpdateMutation({
    endpoint: "/api/analytics/ml-models",
    invalidateKeys: [["/api/analytics/ml-models", orgId]],
    successMessage: "ML model updated successfully",
    errorMessage: "Failed to update ML model",
    onSuccess: () => {
      setIsDialogOpen(false);
      setEditingItem(null);
    },
    transformData: (data: any) => ({ ...data, orgId }),
  });

  const deleteMlModelMutation = useDeleteMutation({
    endpoint: "/api/analytics/ml-models",
    invalidateKeys: [["/api/analytics/ml-models", orgId]],
    successMessage: "ML model deleted successfully",
    errorMessage: "Failed to delete ML model",
    urlSuffix: `?orgId=${orgId}`,
  });

  // Anomaly Detection mutations
  const acknowledgeAnomalyMutation = useCustomMutation({
    mutationFn: ({ id, acknowledgedBy }: { id: number; acknowledgedBy: string }) => 
      apiRequest("PATCH", `/api/analytics/anomaly-detections/${id}/acknowledge`, { acknowledgedBy, orgId }),
    invalidateKeys: [["/api/analytics/anomaly-detections", orgId]],
    successMessage: "Anomaly acknowledged successfully",
    errorMessage: "Failed to acknowledge anomaly",
  });

  // Threshold Optimization mutations
  const applyOptimizationMutation = useCustomMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/analytics/threshold-optimizations/${id}/apply`, { orgId }),
    invalidateKeys: [["/api/analytics/threshold-optimizations", orgId]],
    successMessage: "Threshold optimization applied successfully",
    errorMessage: "Failed to apply threshold optimization",
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
            <div className="overflow-x-auto">
              <TabsList className="inline-flex w-full min-w-fit p-1 gap-1">
                <TabsTrigger 
                  value="ml-models" 
                  data-testid="tab-ml-models"
                  className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px] min-w-[80px] sm:min-w-[120px] transition-all"
                >
                  <Brain className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">ML Models</span>
                  <span className="sm:hidden">ML</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="anomalies" 
                  data-testid="tab-anomalies"
                  className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px] min-w-[80px] sm:min-w-[120px] transition-all"
                >
                  <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Anomalies</span>
                  <span className="sm:hidden">Anom</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="predictions" 
                  data-testid="tab-predictions"
                  className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px] min-w-[80px] sm:min-w-[120px] transition-all"
                >
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Predictions</span>
                  <span className="sm:hidden">Pred</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="optimizations" 
                  data-testid="tab-optimizations"
                  className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px] min-w-[80px] sm:min-w-[120px] transition-all"
                >
                  <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Optimizations</span>
                  <span className="sm:hidden">Opt</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="digital-twins" 
                  data-testid="tab-digital-twins"
                  className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px] min-w-[80px] sm:min-w-[120px] transition-all"
                >
                  <Activity className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Digital Twins</span>
                  <span className="sm:hidden">Twin</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="insights" 
                  data-testid="tab-insights"
                  className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px] min-w-[80px] sm:min-w-[120px] transition-all"
                >
                  <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Insights</span>
                  <span className="sm:hidden">Ins</span>
                </TabsTrigger>
              </TabsList>
            </div>

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
                            <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-0 sm:space-x-2">
                              <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => {
                                  setIsDialogOpen(false);
                                  setEditingItem(null);
                                  mlModelForm.reset();
                                }}
                                className="w-full sm:w-auto"
                                data-testid="button-cancel-model"
                              >
                                Cancel
                              </Button>
                              <Button 
                                type="submit" 
                                data-testid="button-save-model" 
                                disabled={createMlModelMutation.isPending || updateMlModelMutation.isPending}
                                className="w-full sm:w-auto"
                              >
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
                    <div className="overflow-x-auto">
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
                    </div>
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
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                        <TableRow>
                          <TableHead>Equipment</TableHead>
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
                            <TableCell className="font-medium">{getEquipmentName(detection.equipmentId)}</TableCell>
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
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  data-testid={`button-view-details-${detection.id}`}
                                  onClick={() => setSelectedAnomaly(detection)}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Details
                                </Button>
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
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Anomaly Details Dialog */}
              <Dialog open={!!selectedAnomaly} onOpenChange={(open) => !open && setSelectedAnomaly(null)}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-anomaly-details">
                  <DialogHeader>
                    <DialogTitle>Anomaly Detection Details</DialogTitle>
                    <DialogDescription>
                      Detailed information about the detected anomaly
                    </DialogDescription>
                  </DialogHeader>
                  
                  {selectedAnomaly && (
                    <div className="space-y-4">
                      {/* Basic Information */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Equipment</Label>
                          <p className="text-sm font-semibold" data-testid="text-detail-equipment">{getEquipmentName(selectedAnomaly.equipmentId)}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Sensor Type</Label>
                          <p className="text-sm font-semibold" data-testid="text-detail-sensor">{selectedAnomaly.sensorType}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Severity</Label>
                          <Badge variant={getSeverityColor(selectedAnomaly.severity)} data-testid="badge-detail-severity">
                            {selectedAnomaly.severity}
                          </Badge>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Detection Time</Label>
                          <p className="text-sm" data-testid="text-detail-timestamp">{formatDate(selectedAnomaly.detectionTimestamp)}</p>
                        </div>
                      </div>

                      {/* Anomaly Metrics */}
                      {(selectedAnomaly.anomalyScore !== undefined || 
                        selectedAnomaly.anomalyType || 
                        selectedAnomaly.detectedValue !== undefined) && (
                        <div className="border-t pt-4">
                          <h3 className="text-sm font-semibold mb-3">Anomaly Metrics</h3>
                          <div className="grid grid-cols-2 gap-4">
                            {selectedAnomaly.anomalyScore !== undefined && (
                              <div>
                                <Label className="text-sm font-medium text-muted-foreground">Anomaly Score</Label>
                                <p className="text-sm font-semibold" data-testid="text-detail-score">
                                  {(selectedAnomaly.anomalyScore * 100).toFixed(1)}%
                                </p>
                              </div>
                            )}
                            {selectedAnomaly.anomalyType && (
                              <div>
                                <Label className="text-sm font-medium text-muted-foreground">Anomaly Type</Label>
                                <p className="text-sm" data-testid="text-detail-type">{selectedAnomaly.anomalyType}</p>
                              </div>
                            )}
                            {selectedAnomaly.detectedValue !== undefined && (
                              <div>
                                <Label className="text-sm font-medium text-muted-foreground">Detected Value</Label>
                                <p className="text-sm font-semibold" data-testid="text-detail-detected">
                                  {selectedAnomaly.detectedValue.toFixed(2)}
                                </p>
                              </div>
                            )}
                            {selectedAnomaly.expectedValue !== undefined && (
                              <div>
                                <Label className="text-sm font-medium text-muted-foreground">Expected Value</Label>
                                <p className="text-sm" data-testid="text-detail-expected">{selectedAnomaly.expectedValue.toFixed(2)}</p>
                              </div>
                            )}
                            {selectedAnomaly.deviation !== undefined && (
                              <div>
                                <Label className="text-sm font-medium text-muted-foreground">Deviation</Label>
                                <p className="text-sm font-semibold text-red-600" data-testid="text-detail-deviation">
                                  {selectedAnomaly.deviation > 0 ? '+' : ''}{selectedAnomaly.deviation.toFixed(2)}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Contributing Factors */}
                      {selectedAnomaly.contributingFactors && selectedAnomaly.contributingFactors.length > 0 && (
                        <div className="border-t pt-4">
                          <h3 className="text-sm font-semibold mb-3">Contributing Factors</h3>
                          <ul className="space-y-2" data-testid="list-contributing-factors">
                            {selectedAnomaly.contributingFactors.map((factor, index) => (
                              <li key={index} className="text-sm flex items-start gap-2">
                                <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                                <span>{factor}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Recommended Actions */}
                      {selectedAnomaly.recommendedActions && selectedAnomaly.recommendedActions.length > 0 && (
                        <div className="border-t pt-4">
                          <h3 className="text-sm font-semibold mb-3">Recommended Actions</h3>
                          <ul className="space-y-2" data-testid="list-recommended-actions">
                            {selectedAnomaly.recommendedActions.map((action, index) => (
                              <li key={index} className="text-sm flex items-start gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                <span>{action}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Status */}
                      {(selectedAnomaly.acknowledgedBy || selectedAnomaly.acknowledgedAt) && (
                        <div className="border-t pt-4">
                          <h3 className="text-sm font-semibold mb-3">Status</h3>
                          <div className="space-y-2">
                            {selectedAnomaly.acknowledgedBy && (
                              <div>
                                <Label className="text-sm font-medium text-muted-foreground">Acknowledged By</Label>
                                <p className="text-sm" data-testid="text-detail-acknowledged-by">{selectedAnomaly.acknowledgedBy}</p>
                              </div>
                            )}
                            {selectedAnomaly.acknowledgedAt && (
                              <div>
                                <Label className="text-sm font-medium text-muted-foreground">Acknowledged At</Label>
                                <p className="text-sm" data-testid="text-detail-acknowledged-at">{formatDate(selectedAnomaly.acknowledgedAt)}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Contextual Actions */}
                      <div className="border-t pt-4">
                        <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
                        <QuickActions
                          equipmentId={selectedAnomaly.equipmentId}
                          equipmentName={`Equipment ${selectedAnomaly.equipmentId}`}
                          data-testid="anomaly-quick-actions"
                        />
                      </div>
                    </div>
                  )}

                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedAnomaly(null)}
                      data-testid="button-close-details"
                    >
                      Close
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
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
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                        <TableRow>
                          <TableHead>Equipment</TableHead>
                          <TableHead>Risk Level</TableHead>
                          <TableHead>Probability</TableHead>
                          <TableHead>Time to Failure</TableHead>
                          <TableHead>Predicted</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {failurePredictions.map((prediction: FailurePrediction) => (
                          <TableRow key={prediction.id} data-testid={`row-prediction-${prediction.id}`}>
                            <TableCell className="font-medium">{getEquipmentName(prediction.equipmentId)}</TableCell>
                            <TableCell>
                              <Badge variant={getRiskLevelColor(prediction.riskLevel)}>
                                {prediction.riskLevel}
                              </Badge>
                            </TableCell>
                            <TableCell>{(prediction.failureProbability * 100).toFixed(1)}%</TableCell>
                            <TableCell>
                              {prediction.remainingUsefulLife 
                                ? `${prediction.remainingUsefulLife} days`
                                : "Unknown"
                              }
                            </TableCell>
                            <TableCell>{formatDate(prediction.predictionTimestamp)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Generate ML Prediction
                  </CardTitle>
                  <CardDescription>
                    Use trained LSTM and Random Forest models to predict equipment failure
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <MLPredictionGenerator />
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
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                        <TableRow>
                          <TableHead>Equipment</TableHead>
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
                            <TableCell className="font-medium">{getEquipmentName(optimization.equipmentId)}</TableCell>
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
                    </div>
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
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                        <TableRow>
                          <TableHead>Twin Name</TableHead>
                          <TableHead>Vessel</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Last Updated</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {digitalTwins.map((twin: DigitalTwin) => (
                          <TableRow key={twin.id} data-testid={`row-twin-${twin.id}`}>
                            <TableCell className="font-medium">{twin.name || twin.id}</TableCell>
                            <TableCell>{getVesselName(twin.vesselId)}</TableCell>
                            <TableCell>{twin.twinType}</TableCell>
                            <TableCell>{formatDate(twin.lastUpdateTimestamp || twin.lastUpdate)}</TableCell>
                            <TableCell>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                data-testid={`button-view-twin-${twin.id}`}
                                onClick={() => setSelectedDigitalTwin(twin)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Digital Twin Details Dialog */}
              <Dialog open={!!selectedDigitalTwin} onOpenChange={(open) => !open && setSelectedDigitalTwin(null)}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" data-testid="dialog-twin-details">
                  <DialogHeader>
                    <DialogTitle>Digital Twin Details</DialogTitle>
                    <DialogDescription>
                      Detailed information about the digital twin model
                    </DialogDescription>
                  </DialogHeader>
                  
                  {selectedDigitalTwin && (
                    <div className="space-y-4">
                      {/* Basic Information */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Twin ID</Label>
                          <p className="text-sm font-semibold" data-testid="text-twin-id">{selectedDigitalTwin.id}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Vessel</Label>
                          <p className="text-sm font-semibold" data-testid="text-twin-vessel">{getVesselName(selectedDigitalTwin.vesselId)}</p>
                        </div>
                        {selectedDigitalTwin.name && (
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                            <p className="text-sm" data-testid="text-twin-name">{selectedDigitalTwin.name}</p>
                          </div>
                        )}
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Twin Type</Label>
                          <p className="text-sm" data-testid="text-twin-type">{selectedDigitalTwin.twinType}</p>
                        </div>
                        {selectedDigitalTwin.validationStatus && (
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                            <Badge variant={selectedDigitalTwin.validationStatus === 'active' ? 'default' : 'secondary'} data-testid="badge-twin-status">
                              {selectedDigitalTwin.validationStatus}
                            </Badge>
                          </div>
                        )}
                        {selectedDigitalTwin.accuracy !== undefined && (
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Accuracy</Label>
                            <p className="text-sm font-semibold" data-testid="text-twin-accuracy">
                              {(selectedDigitalTwin.accuracy * 100).toFixed(1)}%
                            </p>
                          </div>
                        )}
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                          <p className="text-sm" data-testid="text-twin-updated">
                            {formatDate(selectedDigitalTwin.lastUpdateTimestamp || selectedDigitalTwin.lastUpdate)}
                          </p>
                        </div>
                      </div>

                      {/* Current State */}
                      {selectedDigitalTwin.currentState && Object.keys(selectedDigitalTwin.currentState).length > 0 && (
                        <div className="border-t pt-4">
                          <h3 className="text-sm font-semibold mb-3">Current State</h3>
                          <div className="bg-muted/50 p-4 rounded-md" data-testid="text-twin-state">
                            <JsonDataRenderer data={selectedDigitalTwin.currentState} />
                          </div>
                        </div>
                      )}

                      {/* Specifications */}
                      {selectedDigitalTwin.specifications && Object.keys(selectedDigitalTwin.specifications).length > 0 && (
                        <div className="border-t pt-4">
                          <h3 className="text-sm font-semibold mb-3">Specifications</h3>
                          <div className="bg-muted/50 p-4 rounded-md" data-testid="text-twin-specs">
                            <JsonDataRenderer data={selectedDigitalTwin.specifications} />
                          </div>
                        </div>
                      )}

                      {/* Metadata */}
                      {selectedDigitalTwin.metadata && Object.keys(selectedDigitalTwin.metadata).length > 0 && (
                        <div className="border-t pt-4">
                          <h3 className="text-sm font-semibold mb-3">Additional Information</h3>
                          <div className="bg-muted/50 p-4 rounded-md" data-testid="text-twin-metadata">
                            <JsonDataRenderer data={selectedDigitalTwin.metadata} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedDigitalTwin(null)}
                      data-testid="button-close-twin-details"
                    >
                      Close
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
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
                    <div className="overflow-x-auto">
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
                            <TableCell>{formatDate(snapshot.timestamp || snapshot.createdAt)}</TableCell>
                            <TableCell>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                data-testid={`button-view-insight-${snapshot.id}`}
                                onClick={() => setSelectedInsight(snapshot)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Insights Details Dialog */}
              <Dialog open={!!selectedInsight} onOpenChange={(open) => !open && setSelectedInsight(null)}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="dialog-insight-details">
                  <DialogHeader>
                    <DialogTitle>Analytics Insights Details</DialogTitle>
                    <DialogDescription>
                      Detailed insights and analytics for {selectedInsight?.scope}
                    </DialogDescription>
                  </DialogHeader>
                  
                  {selectedInsight && (
                    <div className="space-y-4">
                      {/* Basic Information */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Scope</Label>
                          <p className="text-sm font-semibold" data-testid="text-insight-scope">{selectedInsight.scope}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Generated At</Label>
                          <p className="text-sm" data-testid="text-insight-timestamp">
                            {formatDate(selectedInsight.timestamp || selectedInsight.createdAt)}
                          </p>
                        </div>
                      </div>

                      {/* Fleet KPIs */}
                      {selectedInsight.kpi?.fleet && (
                        <div className="border-t pt-4">
                          <h3 className="text-sm font-semibold mb-3">Fleet KPIs</h3>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="bg-muted/50 p-3 rounded-md">
                              <Label className="text-xs text-muted-foreground">Total Vessels</Label>
                              <p className="text-2xl font-bold" data-testid="text-kpi-vessels">
                                {selectedInsight.kpi.fleet.vessels}
                              </p>
                            </div>
                            <div className="bg-muted/50 p-3 rounded-md">
                              <Label className="text-xs text-muted-foreground">Signals Mapped</Label>
                              <p className="text-2xl font-bold" data-testid="text-kpi-mapped">
                                {selectedInsight.kpi.fleet.signalsMapped}
                              </p>
                            </div>
                            <div className="bg-muted/50 p-3 rounded-md">
                              <Label className="text-xs text-muted-foreground">Signals Discovered</Label>
                              <p className="text-2xl font-bold" data-testid="text-kpi-discovered">
                                {selectedInsight.kpi.fleet.signalsDiscovered}
                              </p>
                            </div>
                            <div className="bg-muted/50 p-3 rounded-md">
                              <Label className="text-xs text-muted-foreground">Data Quality (7d)</Label>
                              <p className="text-2xl font-bold" data-testid="text-kpi-dq">
                                {selectedInsight.kpi.fleet.dq7d.toFixed(1)}%
                              </p>
                            </div>
                            {selectedInsight.kpi.fleet.latestGapVessels && selectedInsight.kpi.fleet.latestGapVessels.length > 0 && (
                              <div className="bg-muted/50 p-3 rounded-md col-span-2">
                                <Label className="text-xs text-muted-foreground">Vessels with Data Gaps</Label>
                                <p className="text-sm mt-1" data-testid="text-kpi-gaps">
                                  {selectedInsight.kpi.fleet.latestGapVessels.join(', ')}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Per Vessel Details */}
                      {selectedInsight.kpi?.perVessel && Object.keys(selectedInsight.kpi.perVessel).length > 0 && (
                        <div className="border-t pt-4">
                          <h3 className="text-sm font-semibold mb-3">Per Vessel Metrics</h3>
                          <div className="space-y-2 max-h-[300px] overflow-y-auto" data-testid="list-vessel-metrics">
                            {Object.entries(selectedInsight.kpi.perVessel).map(([vesselId, metrics]: [string, any]) => (
                              <div key={vesselId} className="bg-muted/50 p-3 rounded-md">
                                <div className="flex justify-between items-start mb-2">
                                  <p className="font-semibold text-sm">{vesselId}</p>
                                  {metrics.stale && (
                                    <Badge variant="destructive" className="text-xs">Stale Data</Badge>
                                  )}
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                  <div>
                                    <Label className="text-muted-foreground">Last Timestamp</Label>
                                    <p>{metrics.lastTs ? new Date(metrics.lastTs).toLocaleString() : 'N/A'}</p>
                                  </div>
                                  <div>
                                    <Label className="text-muted-foreground">Data Quality (7d)</Label>
                                    <p>{metrics.dq7d?.toFixed(1)}%</p>
                                  </div>
                                  <div>
                                    <Label className="text-muted-foreground">Total Signals</Label>
                                    <p>{metrics.totalSignals}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Risks */}
                      {selectedInsight.risks && Object.keys(selectedInsight.risks).length > 0 && (
                        <div className="border-t pt-4">
                          <h3 className="text-sm font-semibold mb-3">Risk Analysis</h3>
                          <div className="bg-muted/50 p-3 rounded-md">
                            <pre className="text-xs overflow-x-auto" data-testid="text-insight-risks">
                              {JSON.stringify(selectedInsight.risks, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* Other Insights */}
                      {selectedInsight.insights && Object.keys(selectedInsight.insights).length > 0 && (
                        <div className="border-t pt-4">
                          <h3 className="text-sm font-semibold mb-3">Additional Insights</h3>
                          <div className="bg-muted/50 p-3 rounded-md">
                            <pre className="text-xs overflow-x-auto" data-testid="text-insight-data">
                              {JSON.stringify(selectedInsight.insights, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedInsight(null)}
                      data-testid="button-close-insight-details"
                    >
                      Close
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}