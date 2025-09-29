/**
 * Optimization Tools - Advanced Resource & Operational Optimization
 * 
 * Comprehensive optimization dashboard providing:
 * - Scenario Builder: Configure optimization scenarios and constraints
 * - Solver Runs: Execute and monitor optimization algorithms
 * - RUL Analysis: Remaining Useful Life predictions and Weibull analysis
 * - Trend Insights: Enhanced statistical analysis and forecasting
 * - Fleet Controls: Fleet-wide optimization orchestration
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Settings, 
  Play, 
  Pause, 
  RotateCcw,
  TrendingUp,
  BarChart3,
  Zap,
  Target,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Download,
  Upload,
  Edit,
  Trash2,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Ship,
  Users,
  Wrench
} from "lucide-react";
import { z } from "zod";

// Types based on existing optimization infrastructure
interface OptimizerConfiguration {
  id: string;
  orgId: string;
  name: string;
  algorithmType: 'greedy' | 'genetic' | 'simulated_annealing';
  enabled: boolean;
  config: string; // JSON configuration
  maxSchedulingHorizon: number;
  costWeightFactor: number;
  urgencyWeightFactor: number;
  resourceConstraintStrict: boolean;
  conflictResolutionStrategy: 'priority_based' | 'cost_based' | 'earliest_first';
  createdAt: string;
  updatedAt: string;
}

interface OptimizationResult {
  id: string;
  orgId: string;
  configurationId: string;
  runStatus: 'running' | 'completed' | 'failed';
  startTime: string;
  endTime: string | null;
  executionTimeMs: number | null;
  equipmentScope: string; // JSON array
  timeHorizon: number;
  totalSchedules: number;
  totalCostEstimate: number | null;
  costSavings: number | null;
  resourceUtilization: string | null; // JSON
  conflictsResolved: number;
  optimizationScore: number | null;
  algorithmMetrics: string | null; // JSON
  recommendations: string | null; // JSON
  appliedToProduction: boolean;
}

interface TrendAnalysis {
  equipmentId: string;
  sensorType: string;
  timeRange: {
    start: string;
    end: string;
  };
  statisticalSummary: {
    mean: number;
    standardDeviation: number;
    trend: {
      slope: number;
      trendType: 'increasing' | 'decreasing' | 'stable' | 'volatile';
    };
  };
  anomalyDetection: {
    totalAnomalies: number;
    anomalyRate: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
  };
  forecasting: {
    method: string;
    predictions: Array<{
      timestamp: string;
      predictedValue: number;
    }>;
    confidence: number;
  };
}

// Form schemas
const optimizerConfigSchema = z.object({
  name: z.string().min(1, "Name is required"),
  algorithmType: z.enum(['greedy', 'genetic', 'simulated_annealing']),
  enabled: z.boolean(),
  maxSchedulingHorizon: z.number().min(1).max(365),
  costWeightFactor: z.number().min(0).max(1),
  urgencyWeightFactor: z.number().min(0).max(1),
  resourceConstraintStrict: z.boolean(),
  conflictResolutionStrategy: z.enum(['priority_based', 'cost_based', 'earliest_first']),
}).refine((data) => {
  const sum = data.costWeightFactor + data.urgencyWeightFactor;
  console.log("Weight validation:", { cost: data.costWeightFactor, urgency: data.urgencyWeightFactor, sum });
  return sum <= 1.01; // Allow small floating point precision errors
}, {
  message: "Cost weight factor and urgency weight factor must sum to 1.0 or less",
  path: ["urgencyWeightFactor"],
});

type OptimizerConfigForm = z.infer<typeof optimizerConfigSchema>;

export default function OptimizationTools() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State management
  const [activeTab, setActiveTab] = useState("scenarios");
  const [selectedConfiguration, setSelectedConfiguration] = useState<string | null>(null);
  const [selectedResult, setSelectedResult] = useState<string | null>(null);
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Form setup
  const configForm = useForm<OptimizerConfigForm>({
    resolver: zodResolver(optimizerConfigSchema),
    defaultValues: {
      name: "",
      algorithmType: 'greedy',
      enabled: true,
      maxSchedulingHorizon: 90,
      costWeightFactor: 0.4,
      urgencyWeightFactor: 0.6,
      resourceConstraintStrict: true,
      conflictResolutionStrategy: 'priority_based',
    },
  });

  // API Queries
  const { data: configurations, isLoading: configurationsLoading, refetch: refetchConfigurations } = useQuery({
    queryKey: ['/api/optimization/configurations'],
    queryFn: async () => {
      const response = await fetch('/api/optimization/configurations');
      if (!response.ok) throw new Error('Failed to fetch configurations');
      return response.json() as OptimizerConfiguration[];
    },
  });

  const { data: optimizationResults, isLoading: resultsLoading, refetch: refetchResults } = useQuery({
    queryKey: ['/api/optimization/results'],
    queryFn: async () => {
      const response = await fetch('/api/optimization/results');
      if (!response.ok) throw new Error('Failed to fetch results');
      return response.json() as OptimizationResult[];
    },
    refetchInterval: 5000, // Poll for running optimizations
  });

  const { data: trendAnalyses, isLoading: trendsLoading } = useQuery({
    queryKey: ['/api/optimization/trend-insights'],
    queryFn: async () => {
      const response = await fetch('/api/optimization/trend-insights');
      if (!response.ok) throw new Error('Failed to fetch trend insights');
      return response.json() as TrendAnalysis[];
    },
  });

  // Mutations
  const createConfigMutation = useMutation({
    mutationFn: async (data: OptimizerConfigForm) => {
      console.log("Submitting config data:", data);
      const payload = {
        ...data,
        config: {}, // Send as proper object, not stringified
      };
      console.log("Final payload:", payload);
      
      const response = await fetch('/api/optimization/configurations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("API error response:", response.status, errorText);
        throw new Error(`API error: ${response.status} ${errorText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Optimizer configuration created successfully" });
      setConfigDialogOpen(false);
      configForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/optimization/configurations'] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create optimizer configuration", variant: "destructive" });
    },
  });

  const runOptimizationMutation = useMutation({
    mutationFn: async ({ configId, equipmentScope, timeHorizon }: { configId: string, equipmentScope?: string[], timeHorizon?: number }) => {
      const response = await fetch('/api/optimization/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configId, equipmentScope, timeHorizon }),
      });
      if (!response.ok) throw new Error('Failed to start optimization');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Optimization run started successfully" });
      setRunDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/optimization/results'] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to start optimization run", variant: "destructive" });
    },
  });

  const deleteConfigMutation = useMutation({
    mutationFn: async (configId: string) => {
      const response = await fetch(`/api/optimization/configurations/${configId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete configuration');
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Configuration deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/optimization/configurations'] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete configuration", variant: "destructive" });
    },
  });

  // Helper functions
  const getStatusBadge = (status: string) => {
    const variants = {
      running: { color: "bg-blue-500", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
      completed: { color: "bg-green-500", icon: <CheckCircle className="h-3 w-3" /> },
      failed: { color: "bg-red-500", icon: <XCircle className="h-3 w-3" /> },
    };
    const variant = variants[status as keyof typeof variants] || variants.failed;
    
    return (
      <Badge className={`${variant.color} text-white`}>
        {variant.icon}
        <span className="ml-1 capitalize">{status}</span>
      </Badge>
    );
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  // Filter configurations and results
  const filteredConfigurations = configurations?.filter(config =>
    config.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const filteredResults = optimizationResults?.filter(result => {
    const matchesSearch = configurations?.find(c => c.id === result.configurationId)?.name
      .toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || result.runStatus === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Optimization Tools</h1>
          <p className="text-muted-foreground mt-2">
            Advanced resource allocation, scheduling optimization, and operational efficiency management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              refetchConfigurations();
              refetchResults();
            }}
            data-testid="button-refresh"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-create-config">
                <Plus className="h-4 w-4 mr-2" />
                New Configuration
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Optimizer Configuration</DialogTitle>
                <DialogDescription>
                  Configure a new optimization scenario with algorithm parameters and constraints
                </DialogDescription>
              </DialogHeader>
              <Form {...configForm}>
                <form onSubmit={configForm.handleSubmit((data) => createConfigMutation.mutate(data))} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={configForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Configuration Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Fleet Maintenance Optimization" {...field} data-testid="input-config-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={configForm.control}
                      name="algorithmType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Algorithm Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-algorithm-type">
                                <SelectValue placeholder="Select algorithm" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="greedy">Greedy (Fast)</SelectItem>
                              <SelectItem value="genetic">Genetic Algorithm</SelectItem>
                              <SelectItem value="simulated_annealing">Simulated Annealing</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={configForm.control}
                      name="maxSchedulingHorizon"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Time Horizon (Days)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              onChange={e => field.onChange(parseInt(e.target.value))}
                              data-testid="input-time-horizon"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={configForm.control}
                      name="costWeightFactor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cost Weight Factor</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1" 
                              min="0" 
                              max="1"
                              {...field}
                              onChange={e => field.onChange(parseFloat(e.target.value))}
                              data-testid="input-cost-weight"
                            />
                          </FormControl>
                          <FormDescription>
                            Weight for cost optimization (0.0 - 1.0)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={configForm.control}
                      name="urgencyWeightFactor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Urgency Weight Factor</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1" 
                              min="0" 
                              max="1"
                              {...field}
                              onChange={e => field.onChange(parseFloat(e.target.value))}
                              data-testid="input-urgency-weight"
                            />
                          </FormControl>
                          <FormDescription>
                            Weight for urgency optimization (0.0 - 1.0)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={configForm.control}
                      name="conflictResolutionStrategy"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Conflict Resolution Strategy</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-conflict-strategy">
                                <SelectValue placeholder="Select strategy" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="priority_based">Priority Based</SelectItem>
                              <SelectItem value="cost_based">Cost Based</SelectItem>
                              <SelectItem value="earliest_first">Earliest First</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={configForm.control}
                      name="enabled"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <FormLabel>Enabled</FormLabel>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-enabled"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={configForm.control}
                      name="resourceConstraintStrict"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <FormLabel>Strict Resource Constraints</FormLabel>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-strict-constraints"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setConfigDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createConfigMutation.isPending} data-testid="button-save-config">
                      {createConfigMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Save Configuration
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search configurations and results..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40" data-testid="select-status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex w-full min-w-fit p-1 gap-1">
            <TabsTrigger 
              value="scenarios" 
              data-testid="tab-scenarios"
              className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px] min-w-[80px] sm:min-w-[140px] transition-all"
            >
              <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Scenario Builder</span>
              <span className="sm:hidden">Scenario</span>
            </TabsTrigger>
            <TabsTrigger 
              value="runs" 
              data-testid="tab-runs"
              className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px] min-w-[80px] sm:min-w-[140px] transition-all"
            >
              <Play className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Solver Runs</span>
              <span className="sm:hidden">Runs</span>
            </TabsTrigger>
            <TabsTrigger 
              value="rul" 
              data-testid="tab-rul"
              className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px] min-w-[80px] sm:min-w-[140px] transition-all"
            >
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">RUL Analysis</span>
              <span className="sm:hidden">RUL</span>
            </TabsTrigger>
            <TabsTrigger 
              value="trends" 
              data-testid="tab-trends"
              className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px] min-w-[80px] sm:min-w-[140px] transition-all"
            >
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Trend Insights</span>
              <span className="sm:hidden">Trends</span>
            </TabsTrigger>
            <TabsTrigger 
              value="fleet" 
              data-testid="tab-fleet"
              className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px] min-w-[80px] sm:min-w-[140px] transition-all"
            >
              <Ship className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Fleet Controls</span>
              <span className="sm:hidden">Fleet</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Scenario Builder Tab */}
        <TabsContent value="scenarios" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Optimizer Configurations
              </CardTitle>
              <CardDescription>
                Manage optimization scenarios and algorithm parameters
              </CardDescription>
            </CardHeader>
            <CardContent>
              {configurationsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : filteredConfigurations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground" data-testid="text-no-configurations">
                  No optimizer configurations found
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredConfigurations.map((config) => (
                    <Card key={config.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold" data-testid={`text-config-name-${config.id}`}>{config.name}</h3>
                              {config.enabled ? (
                                <Badge className="bg-green-500 text-white">Active</Badge>
                              ) : (
                                <Badge variant="outline">Inactive</Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Algorithm:</span>
                                <p className="font-medium capitalize" data-testid={`text-algorithm-${config.id}`}>{config.algorithmType}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Time Horizon:</span>
                                <p className="font-medium">{config.maxSchedulingHorizon} days</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Cost Weight:</span>
                                <p className="font-medium">{(config.costWeightFactor * 100).toFixed(0)}%</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Strategy:</span>
                                <p className="font-medium">{config.conflictResolutionStrategy.replace('_', ' ')}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedConfiguration(config.id);
                                setRunDialogOpen(true);
                              }}
                              disabled={!config.enabled}
                              data-testid={`button-run-${config.id}`}
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Run
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteConfigMutation.mutate(config.id)}
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Solver Runs Tab */}
        <TabsContent value="runs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Optimization Results
              </CardTitle>
              <CardDescription>
                Monitor optimization runs and review results
              </CardDescription>
            </CardHeader>
            <CardContent>
              {resultsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : filteredResults.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground" data-testid="text-no-results">
                  No optimization results found
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredResults.map((result) => {
                    const config = configurations?.find(c => c.id === result.configurationId);
                    return (
                      <Card key={result.id} className="border-l-4 border-l-green-500">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold" data-testid={`text-result-config-${result.id}`}>
                                  {config?.name || 'Unknown Configuration'}
                                </h3>
                                {getStatusBadge(result.runStatus)}
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Started:</span>
                                  <p className="font-medium">
                                    {new Date(result.startTime).toLocaleDateString()}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Duration:</span>
                                  <p className="font-medium" data-testid={`text-duration-${result.id}`}>
                                    {formatDuration(result.executionTimeMs)}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Schedules:</span>
                                  <p className="font-medium">{result.totalSchedules}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Cost Savings:</span>
                                  <p className="font-medium text-green-600" data-testid={`text-savings-${result.id}`}>
                                    {formatCurrency(result.costSavings)}
                                  </p>
                                </div>
                              </div>
                              
                              {result.runStatus === 'completed' && result.optimizationScore && (
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">Optimization Score:</span>
                                    <Badge variant="outline" className="font-mono">
                                      {result.optimizationScore.toFixed(2)}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">Conflicts Resolved:</span>
                                    <Badge variant="outline">
                                      {result.conflictsResolved}
                                    </Badge>
                                  </div>
                                </div>
                              )}
                              
                              {result.runStatus === 'running' && (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-sm">
                                    <span>Optimization in progress...</span>
                                    <span>{formatDuration(Date.now() - new Date(result.startTime).getTime())}</span>
                                  </div>
                                  <Progress value={65} className="w-full" />
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {result.runStatus === 'completed' && (
                                <>
                                  <Button variant="outline" size="sm" data-testid={`button-view-${result.id}`}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    disabled={result.appliedToProduction}
                                    data-testid={`button-apply-${result.id}`}
                                  >
                                    {result.appliedToProduction ? 'Applied' : 'Apply to Production'}
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* RUL Analysis Tab */}
        <TabsContent value="rul" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Remaining Useful Life Analysis
                </CardTitle>
                <CardDescription>
                  Weibull analysis and life prediction for equipment components
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center py-12 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p data-testid="text-rul-coming-soon">RUL analysis integration coming soon</p>
                    <p className="text-sm mt-2">Connect with existing Weibull analysis services</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Component Health Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['Main Engine', 'Hydraulic Pump', 'Cooling System', 'Generator'].map((component, index) => (
                    <div key={component} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{component}</p>
                        <p className="text-sm text-muted-foreground">Last analysis: 2 days ago</p>
                      </div>
                      <div className="text-right">
                        <Badge 
                          className={`${
                            index === 0 ? 'bg-red-500' : 
                            index === 1 ? 'bg-yellow-500' : 
                            'bg-green-500'
                          } text-white`}
                        >
                          {index === 0 ? 'Critical' : index === 1 ? 'Warning' : 'Good'}
                        </Badge>
                        <p className="text-sm mt-1">
                          {index === 0 ? '45 days' : index === 1 ? '180 days' : '2+ years'} remaining
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trend Insights Tab */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Enhanced Trend Analytics
              </CardTitle>
              <CardDescription>
                Advanced statistical analysis and forecasting insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trendsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p data-testid="text-trends-coming-soon">Enhanced trend insights integration coming soon</p>
                  <p className="text-sm mt-2">Connect with existing enhanced-trends service</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fleet Controls Tab */}
        <TabsContent value="fleet" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ship className="h-5 w-5" />
                  Fleet Optimization
                </CardTitle>
                <CardDescription>
                  Fleet-wide resource allocation and scheduling coordination
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Ship className="h-4 w-4" />
                        <span className="text-sm font-medium">Active Vessels</span>
                      </div>
                      <p className="text-2xl font-bold">12</p>
                    </Card>
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4" />
                        <span className="text-sm font-medium">Crew Members</span>
                      </div>
                      <p className="text-2xl font-bold">48</p>
                    </Card>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-3">
                    <Button className="w-full" data-testid="button-fleet-optimization">
                      <Zap className="h-4 w-4 mr-2" />
                      Run Fleet Optimization
                    </Button>
                    <Button variant="outline" className="w-full" data-testid="button-crew-scheduling">
                      <Users className="h-4 w-4 mr-2" />
                      Optimize Crew Scheduling
                    </Button>
                    <Button variant="outline" className="w-full" data-testid="button-maintenance-scheduling">
                      <Wrench className="h-4 w-4 mr-2" />
                      Schedule Maintenance
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Fleet Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Resource Utilization</span>
                      <span>78%</span>
                    </div>
                    <Progress value={78} />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Schedule Efficiency</span>
                      <span>85%</span>
                    </div>
                    <Progress value={85} />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Cost Optimization</span>
                      <span>92%</span>
                    </div>
                    <Progress value={92} />
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">$124K</p>
                      <p className="text-sm text-muted-foreground">Cost Savings</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">96%</p>
                      <p className="text-sm text-muted-foreground">On-Time Rate</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Run Optimization Dialog */}
      <Dialog open={runDialogOpen} onOpenChange={setRunDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run Optimization</DialogTitle>
            <DialogDescription>
              Execute optimization with selected configuration
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Configuration</Label>
              <p className="text-sm text-muted-foreground">
                {configurations?.find(c => c.id === selectedConfiguration)?.name}
              </p>
            </div>
            <div>
              <Label htmlFor="time-horizon">Time Horizon (Days)</Label>
              <Input
                id="time-horizon"
                type="number"
                defaultValue={90}
                min={1}
                max={365}
                data-testid="input-run-time-horizon"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRunDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => selectedConfiguration && runOptimizationMutation.mutate({ configId: selectedConfiguration })}
              disabled={runOptimizationMutation.isPending}
              data-testid="button-start-optimization"
            >
              {runOptimizationMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Start Optimization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}