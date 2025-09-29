import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Activity, 
  BarChart3, 
  AlertCircle, 
  Settings, 
  Zap, 
  Upload,
  PlayCircle,
  Database,
  TrendingUp,
  Waves
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";

// Type definitions for PdM Pack API responses
interface PdmAlert {
  id: string;
  vesselName: string;
  assetId: string;
  assetClass: 'bearing' | 'pump';
  feature: string;
  value: number;
  scoreZ: number;
  severity: 'info' | 'warn' | 'high';
  at: string;
  explain: any;
}

interface PdmBaseline {
  id: string;
  vesselName: string;
  assetId: string;
  assetClass: 'bearing' | 'pump';
  feature: string;
  mu: number;
  sigma: number;
  n: number;
  updatedAt: string;
}

interface AnalysisResult {
  features: Record<string, number>;
  scores: Record<string, number>;
  severity: 'info' | 'warn' | 'high';
  worstZ: number;
  explanation: any;
}

// API functions for PdM Pack
async function fetchPdmAlerts(): Promise<PdmAlert[]> {
  const response = await fetch('/api/pdm/alerts', {
    headers: {
      'x-org-id': 'default-org-id'
    }
  });
  if (!response.ok) {
    throw new Error('Failed to fetch PdM alerts');
  }
  return response.json();
}

async function fetchPdmHealth() {
  const response = await fetch('/api/pdm/health');
  if (!response.ok) {
    throw new Error('Failed to fetch PdM service health');
  }
  return response.json();
}

async function fetchBaselineStats(vesselName: string, assetId: string): Promise<PdmBaseline[]> {
  const response = await fetch(`/api/pdm/baseline/${vesselName}/${assetId}`, {
    headers: {
      'x-org-id': 'default-org-id'
    }
  });
  if (!response.ok) {
    if (response.status === 404) {
      return [];
    }
    throw new Error('Failed to fetch baseline statistics');
  }
  const result = await response.json();
  return result.baselines || [];
}

export default function PdmPack() {
  // State management
  const [selectedVessel, setSelectedVessel] = useState<string>('MV Green Belt');
  const [selectedAsset, setSelectedAsset] = useState<string>('PUMP001');
  const [activeTab, setActiveTab] = useState<string>('overview');
  
  // Analysis results state
  const [bearingAnalysisResult, setBearingAnalysisResult] = useState<AnalysisResult | null>(null);
  const [pumpAnalysisResult, setPumpAnalysisResult] = useState<AnalysisResult | null>(null);

  // Form validation schemas
  const bearingFormSchema = z.object({
    vesselName: z.string().min(1, "Vessel name is required"),
    assetId: z.string().min(1, "Asset ID is required"),
    fs: z.number().min(1, "Sampling frequency must be positive"),
    rpm: z.number().min(0).optional(),
    series: z.string().min(1, "Vibration data is required"),
    autoBaseline: z.boolean()
  });

  const pumpFormSchema = z.object({
    vesselName: z.string().min(1, "Vessel name is required"),
    assetId: z.string().min(1, "Asset ID is required"),
    flow: z.string().optional(),
    pressure: z.string().optional(),
    current: z.string().optional(),
    autoBaseline: z.boolean()
  }).refine((data) => data.flow || data.pressure || data.current, {
    message: "At least one data source is required"
  });

  // Form instances
  const bearingForm = useForm<z.infer<typeof bearingFormSchema>>({
    resolver: zodResolver(bearingFormSchema),
    defaultValues: {
      vesselName: 'MV Green Belt',
      assetId: 'BEARING001',
      fs: 1000,
      rpm: 1800,
      series: '',
      autoBaseline: true
    }
  });

  const pumpForm = useForm<z.infer<typeof pumpFormSchema>>({
    resolver: zodResolver(pumpFormSchema),
    defaultValues: {
      vesselName: 'MV Green Belt',
      assetId: 'PUMP001',
      flow: '',
      pressure: '',
      current: '',
      autoBaseline: true
    }
  });

  // Query for PdM alerts
  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['/api/pdm/alerts'],
    queryFn: fetchPdmAlerts,
    refetchInterval: 30000,
  });

  // Query for service health
  const { data: healthData, isLoading: healthLoading } = useQuery({
    queryKey: ['/api/pdm/health'],
    queryFn: fetchPdmHealth,
    refetchInterval: 60000,
  });

  // Query for baseline statistics
  const { data: baselines, isLoading: baselinesLoading } = useQuery({
    queryKey: ['/api/pdm/baseline', selectedVessel, selectedAsset],
    queryFn: () => fetchBaselineStats(selectedVessel, selectedAsset),
    enabled: !!selectedVessel && !!selectedAsset,
    refetchInterval: 30000,
  });

  // Mutation for bearing analysis
  const bearingAnalysisMutation = useMutation({
    mutationFn: async (data: z.infer<typeof bearingFormSchema>) => {
      const series = data.series.split(',').map((s: string) => parseFloat(s.trim())).filter((n: number) => !isFinite(n) === false);
      if (series.length < 10) {
        throw new Error('At least 10 data points required for analysis');
      }
      
      const response = await apiRequest('POST', '/api/pdm/analyze/bearing', {
        ...data,
        series
      });
      return response;
    },
    onSuccess: (data: any) => {
      setBearingAnalysisResult(data.analysis);
      toast({
        title: "Analysis Complete",
        description: "Bearing vibration analysis completed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/pdm/alerts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pdm/baseline'] });
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze bearing data",
        variant: "destructive",
      });
    }
  });

  // Mutation for pump analysis
  const pumpAnalysisMutation = useMutation({
    mutationFn: async (data: z.infer<typeof pumpFormSchema>) => {
      const processedData: any = {
        vesselName: data.vesselName,
        assetId: data.assetId,
        autoBaseline: data.autoBaseline
      };

      // Process array fields
      ['flow', 'pressure', 'current'].forEach(field => {
        const value = data[field as keyof typeof data] as string;
        if (value && value.trim()) {
          const values = value.split(',').map((s: string) => parseFloat(s.trim())).filter((n: number) => !isNaN(n));
          if (values.length > 0) {
            processedData[field] = values;
          }
        }
      });

      const response = await apiRequest('POST', '/api/pdm/analyze/pump', processedData);
      return response;
    },
    onSuccess: (data: any) => {
      setPumpAnalysisResult(data.analysis);
      toast({
        title: "Analysis Complete",
        description: "Pump process analysis completed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/pdm/alerts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pdm/baseline'] });
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed", 
        description: error.message || "Failed to analyze pump data",
        variant: "destructive",
      });
    }
  });

  // Calculate summary statistics
  const recentAlerts = alerts?.filter(a => {
    const alertTime = new Date(a.at).getTime();
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    return alertTime > oneDayAgo;
  }) || [];

  const criticalCount = recentAlerts.filter(a => a.severity === 'high').length;
  const warningCount = recentAlerts.filter(a => a.severity === 'warn').length;
  const serviceStatus = healthData?.status === 'operational';

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-500';
      case 'warn': return 'text-yellow-500';
      case 'info': return 'text-blue-500';
      default: return 'text-muted-foreground';
    }
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'warn': return 'secondary';
      case 'info': return 'outline';
      default: return 'outline';
    }
  };

  // Analysis Results Display Component
  const AnalysisResultsCard = ({ result, title, isLoading }: { 
    result: AnalysisResult | null; 
    title: string; 
    isLoading: boolean; 
  }) => {
    if (isLoading) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>{title} Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Analyzing...</div>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (!result) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>{title} Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-muted-foreground">Run analysis to see results</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {title} Results
            <Badge 
              variant={result.severity === 'high' ? 'destructive' : result.severity === 'warn' ? 'secondary' : 'outline'}
              className={result.severity === 'high' ? '' : result.severity === 'warn' ? '' : 'border-green-500 text-green-500'}
            >
              {result.severity.toUpperCase()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Worst Z-Score</Label>
              <p className="text-2xl font-bold mt-1" data-testid={`worst-z-${title.toLowerCase().replace(' ', '-')}`}>
                {result.worstZ.toFixed(2)}
              </p>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Feature Scores</Label>
              <div className="space-y-2 mt-2">
                {Object.entries(result.scores).map(([feature, score]) => (
                  <div key={feature} className="flex justify-between items-center p-2 border rounded">
                    <span className="text-sm font-mono">{feature}</span>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        Z: {score.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Value: {result.features[feature]?.toFixed(4)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {result.explanation && (
              <div>
                <Label className="text-sm font-medium">Analysis Details</Label>
                <div className="mt-2 p-3 bg-muted rounded text-xs font-mono">
                  <pre>{JSON.stringify(result.explanation, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (alertsLoading || healthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading PdM Pack...</div>
      </div>
    );
  }

  if (alerts === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Failed to load PdM alerts. Please check your connection.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">PdM Pack v1</h2>
            <p className="text-muted-foreground">
              Statistical baseline monitoring for bearings and pumps with Welford's algorithm
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant={serviceStatus ? "outline" : "destructive"} 
              className={serviceStatus ? "border-green-500 text-green-500" : ""}
              data-testid="service-status"
            >
              {serviceStatus ? "Operational" : "Service Issue"}
            </Badge>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Service Health & Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Service Status</p>
                  <p className="text-2xl font-bold text-foreground mt-1" data-testid="metric-service-status">
                    {serviceStatus ? "Online" : "Offline"}
                  </p>
                </div>
                <div className={`${serviceStatus ? 'bg-green-500/20' : 'bg-red-500/20'} p-3 rounded-lg`}>
                  <Activity className={serviceStatus ? "text-green-500" : "text-red-500"} size={20} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Critical Alerts (24h)</p>
                  <p className="text-2xl font-bold text-red-500 mt-1" data-testid="metric-critical-alerts">
                    {criticalCount}
                  </p>
                </div>
                <div className="bg-red-500/20 p-3 rounded-lg">
                  <AlertCircle className="text-red-500" size={20} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Warning Alerts (24h)</p>
                  <p className="text-2xl font-bold text-yellow-500 mt-1" data-testid="metric-warning-alerts">
                    {warningCount}
                  </p>
                </div>
                <div className="bg-yellow-500/20 p-3 rounded-lg">
                  <TrendingUp className="text-yellow-500" size={20} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Total Alerts (24h)</p>
                  <p className="text-2xl font-bold text-foreground mt-1" data-testid="metric-total-alerts">
                    {recentAlerts.length}
                  </p>
                </div>
                <div className="bg-blue-500/20 p-3 rounded-lg">
                  <BarChart3 className="text-blue-500" size={20} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="inline-flex w-full overflow-x-auto">
            <TabsTrigger 
              value="overview" 
              data-testid="tab-overview"
              className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px] min-w-[60px] sm:min-w-[80px] transition-all"
            >
              <Database className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Overview</span>
              <span className="sm:hidden">Over</span>
            </TabsTrigger>
            <TabsTrigger 
              value="bearing-analysis" 
              data-testid="tab-bearing-analysis"
              className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px] min-w-[60px] sm:min-w-[80px] transition-all"
            >
              <Waves className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Bearing Analysis</span>
              <span className="sm:hidden">Bearing</span>
            </TabsTrigger>
            <TabsTrigger 
              value="pump-analysis" 
              data-testid="tab-pump-analysis"
              className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px] min-w-[60px] sm:min-w-[80px] transition-all"
            >
              <Settings className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Pump Analysis</span>
              <span className="sm:hidden">Pump</span>
            </TabsTrigger>
            <TabsTrigger 
              value="baselines" 
              data-testid="tab-baselines"
              className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px] min-w-[60px] sm:min-w-[80px] transition-all"
            >
              <TrendingUp className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Baselines</span>
              <span className="sm:hidden">Base</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Alerts */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Recent Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {recentAlerts.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">No recent alerts</p>
                    ) : (
                      recentAlerts.map((alert) => (
                        <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={getSeverityBadgeColor(alert.severity)} className="text-xs">
                                {alert.severity.toUpperCase()}
                              </Badge>
                              <span className="font-medium text-sm">{alert.assetId}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {alert.feature}: {alert.value.toFixed(2)} (Z-score: {alert.scoreZ.toFixed(1)})
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(alert.at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Service Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Service Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Service Version</Label>
                      <p className="text-sm text-muted-foreground mt-1">PdM Pack v1</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Features</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {healthData?.features?.map((feature: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {feature.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Last Health Check</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {healthData?.timestamp ? new Date(healthData.timestamp).toLocaleString() : 'Unknown'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Bearing Analysis Tab */}
          <TabsContent value="bearing-analysis" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Waves className="w-5 h-5" />
                    Bearing Vibration Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...bearingForm}>
                    <form onSubmit={bearingForm.handleSubmit((data) => bearingAnalysisMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={bearingForm.control}
                        name="vesselName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Vessel Name</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-bearing-vessel" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={bearingForm.control}
                        name="assetId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Asset ID</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-bearing-asset" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={bearingForm.control}
                          name="fs"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sampling Frequency (Hz)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  {...field} 
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  data-testid="input-bearing-fs" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={bearingForm.control}
                          name="rpm"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>RPM (optional)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  {...field}
                                  value={field.value || ''}
                                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                  data-testid="input-bearing-rpm" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={bearingForm.control}
                        name="series"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Vibration Data (comma-separated)</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="0.1, 0.2, 0.15, -0.1, 0.3, ..."
                                className="min-h-[100px]"
                                {...field}
                                data-testid="input-bearing-series" 
                              />
                            </FormControl>
                            <FormMessage />
                            <p className="text-xs text-muted-foreground">
                              Enter at least 10 data points separated by commas
                            </p>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={bearingForm.control}
                        name="autoBaseline"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="checkbox-bearing-auto-baseline"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Auto-update baseline if analysis looks good</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit"
                        disabled={bearingAnalysisMutation.isPending}
                        className="w-full"
                        data-testid="button-analyze-bearing"
                      >
                        {bearingAnalysisMutation.isPending ? (
                          <>
                            <Zap className="w-4 h-4 mr-2 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <PlayCircle className="w-4 h-4 mr-2" />
                            Analyze Bearing
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                  
                  <div className="mt-6">
                    <Alert>
                      <Activity className="h-4 w-4" />
                      <AlertDescription>
                        Bearing analysis performs comprehensive vibration analysis including RMS, kurtosis, 
                        envelope detection, and ISO 10816 band analysis. Results are compared against 
                        statistical baselines using Z-scores.
                      </AlertDescription>
                    </Alert>
                  </div>
                </CardContent>
              </Card>
              
              <AnalysisResultsCard 
                result={bearingAnalysisResult} 
                title="Bearing Analysis" 
                isLoading={bearingAnalysisMutation.isPending}
              />
            </div>
          </TabsContent>

          {/* Pump Analysis Tab */}
          <TabsContent value="pump-analysis" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Pump Process Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...pumpForm}>
                    <form onSubmit={pumpForm.handleSubmit((data) => pumpAnalysisMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={pumpForm.control}
                        name="vesselName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Vessel Name</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-pump-vessel" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={pumpForm.control}
                        name="assetId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Asset ID</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-pump-asset" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={pumpForm.control}
                        name="flow"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Flow Data (comma-separated, optional)</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="100.5, 101.2, 99.8, 102.1, ..."
                                {...field}
                                data-testid="input-pump-flow" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={pumpForm.control}
                        name="pressure"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pressure Data (comma-separated, optional)</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="50.2, 49.8, 51.1, 50.5, ..."
                                {...field}
                                data-testid="input-pump-pressure" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={pumpForm.control}
                        name="current"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Data (comma-separated, optional)</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="15.2, 15.1, 15.3, 15.0, ..."
                                {...field}
                                data-testid="input-pump-current" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={pumpForm.control}
                        name="autoBaseline"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="checkbox-pump-auto-baseline"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Auto-update baseline if analysis looks good</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit"
                        disabled={pumpAnalysisMutation.isPending}
                        className="w-full"
                        data-testid="button-analyze-pump"
                      >
                        {pumpAnalysisMutation.isPending ? (
                          <>
                            <Zap className="w-4 h-4 mr-2 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <PlayCircle className="w-4 h-4 mr-2" />
                            Analyze Pump
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                  
                  <div className="mt-6">
                    <Alert>
                      <Settings className="h-4 w-4" />
                      <AlertDescription>
                        Pump analysis monitors process parameters including flow, pressure, and current. 
                        Provides efficiency estimation and cavitation detection. At least one data source 
                        is required for analysis.
                      </AlertDescription>
                    </Alert>
                  </div>
                </CardContent>
              </Card>
              
              <AnalysisResultsCard 
                result={pumpAnalysisResult} 
                title="Pump Analysis" 
                isLoading={pumpAnalysisMutation.isPending}
              />
            </div>
          </TabsContent>

          {/* Baselines Tab */}
          <TabsContent value="baselines" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Baseline Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="baseline-vessel">Vessel Name</Label>
                      <Select value={selectedVessel} onValueChange={setSelectedVessel}>
                        <SelectTrigger data-testid="select-baseline-vessel">
                          <SelectValue placeholder="Select vessel" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MV Green Belt">MV Green Belt</SelectItem>
                          <SelectItem value="MV Ocean Explorer">MV Ocean Explorer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="baseline-asset">Asset ID</Label>
                      <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                        <SelectTrigger data-testid="select-baseline-asset">
                          <SelectValue placeholder="Select asset" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BEARING001">BEARING001</SelectItem>
                          <SelectItem value="BEARING002">BEARING002</SelectItem>
                          <SelectItem value="PUMP001">PUMP001</SelectItem>
                          <SelectItem value="PUMP002">PUMP002</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {baselinesLoading ? (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground">Loading baseline data...</p>
                    </div>
                  ) : baselines && baselines.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {baselines.map((baseline) => (
                        <div key={baseline.id} className="p-4 border rounded-lg">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                              <Label className="text-xs font-medium text-muted-foreground">Feature</Label>
                              <p className="text-sm font-mono">{baseline.feature}</p>
                            </div>
                            <div>
                              <Label className="text-xs font-medium text-muted-foreground">Mean (μ)</Label>
                              <p className="text-sm font-mono">{baseline.mu.toFixed(4)}</p>
                            </div>
                            <div>
                              <Label className="text-xs font-medium text-muted-foreground">Std Dev (σ)</Label>
                              <p className="text-sm font-mono">{baseline.sigma.toFixed(4)}</p>
                            </div>
                            <div>
                              <Label className="text-xs font-medium text-muted-foreground">Samples (n)</Label>
                              <p className="text-sm font-mono">{baseline.n}</p>
                            </div>
                          </div>
                          <div className="mt-2 pt-2 border-t">
                            <Label className="text-xs font-medium text-muted-foreground">Last Updated</Label>
                            <p className="text-xs text-muted-foreground">
                              {new Date(baseline.updatedAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No baseline data found for {selectedVessel} - {selectedAsset}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Run analysis with auto-baseline enabled to establish baselines
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}