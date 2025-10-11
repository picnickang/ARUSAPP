import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useCustomMutation } from "@/hooks/useCrudMutations";
import { 
  Brain, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Sparkles,
  RefreshCw,
  ChevronRight,
  BarChart3,
  Settings,
  Loader2
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Equipment {
  id: string;
  name: string;
  type: string;
  manufacturer?: string;
  model?: string;
}

interface ThresholdOptimization {
  id: number;
  equipmentId: string;
  sensorType: string;
  equipmentType: string;
  optimizationTimestamp: string;
  currentThresholds: any;
  optimizedThresholds: any;
  improvementMetrics: any;
  optimizationMethod: string;
  status: string;
  metadata: any;
}

interface SensorRecommendation {
  sensorType: string;
  parameters: {
    gain?: number;
    offset?: number;
    emaAlpha?: number;
    hysteresis?: number;
    warnLo?: number;
    warnHi?: number;
    critLo?: number;
    critHi?: number;
  };
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
  sources: string[];
}

export default function SensorOptimizationPage() {
  const { toast } = useToast();
  const [selectedEquipment, setSelectedEquipment] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("statistical");

  const orgId = 'default-org-id';

  // Fetch equipment list
  const { data: equipment = [], isLoading: equipmentLoading } = useQuery<Equipment[]>({
    queryKey: ['/api/equipment'],
    staleTime: 30000,
  });

  // Fetch statistical recommendations
  const { data: statisticalRecs = [], isLoading: statsLoading, refetch: refetchStats } = useQuery<ThresholdOptimization[]>({
    queryKey: ['/api/sensor-optimization/recommendations'],
    enabled: activeTab === 'statistical',
  });

  // Fetch AI recommendations for selected equipment
  const { data: aiRecommendations, isLoading: aiLoading, error: aiError, refetch: refetchAI } = useQuery<{ recommendations: SensorRecommendation[] }>({
    queryKey: ['/api/sensor-tuning/recommendations', selectedEquipment],
    enabled: activeTab === 'ai' && !!selectedEquipment,
    retry: false, // Don't retry on 503 errors
  });

  // Run statistical analysis mutation
  const analyzeMutation = useCustomMutation({
    mutationFn: async (equipmentId: string) => {
      const response = await apiRequest(
        'POST',
        `/api/sensor-optimization/analyze/${equipmentId}`,
        { daysOfHistory: 30 }
      );
      return response;
    },
    invalidateKeys: [['/api/sensor-optimization/recommendations']],
    successMessage: "Sensor threshold recommendations generated successfully.",
    errorMessage: (error) => error instanceof Error ? error.message : "Failed to analyze sensor data",
    onSuccess: () => {
      refetchStats();
    },
  });

  // Apply statistical optimization
  const applyOptimizationMutation = useCustomMutation({
    mutationFn: async (optimizationId: number) => {
      const response = await apiRequest(
        'POST',
        `/api/sensor-optimization/apply/${optimizationId}`,
        undefined
      );
      return response;
    },
    invalidateKeys: [['/api/sensor-optimization/recommendations'], ['/api/sensor-configs']],
    successMessage: "Threshold optimization has been applied.",
    errorMessage: (error) => error instanceof Error ? error.message : "Could not apply optimization",
    onSuccess: () => {
      refetchStats();
    },
  });

  // Reject optimization
  const rejectOptimizationMutation = useCustomMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const response = await apiRequest(
        'POST',
        `/api/sensor-optimization/reject/${id}`,
        { reason }
      );
      return response;
    },
    invalidateKeys: [['/api/sensor-optimization/recommendations']],
    successMessage: "Optimization has been rejected.",
    onSuccess: () => {
      refetchStats();
    },
  });

  // Apply AI recommendation
  const applyAIRecommendationMutation = useCustomMutation({
    mutationFn: async ({ equipmentId, sensorType, parameters }: { equipmentId: string; sensorType: string; parameters: any }) => {
      const response = await apiRequest(
        'POST',
        `/api/sensor-tuning/apply/${equipmentId}/${sensorType}`,
        { parameters }
      );
      return response;
    },
    invalidateKeys: [['/api/sensor-configs']],
    successMessage: "AI-recommended parameters have been applied to the sensor.",
    errorMessage: (error) => error instanceof Error ? error.message : "Could not apply AI recommendations",
  });

  const getConfidenceBadge = (confidence: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      high: 'default',
      medium: 'secondary',
      low: 'outline',
    };
    return <Badge variant={variants[confidence] || 'outline'}>{confidence}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
      pending_review: { variant: 'secondary', icon: AlertTriangle },
      applied: { variant: 'default', icon: CheckCircle2 },
      rejected: { variant: 'destructive', icon: XCircle },
    };
    const config = variants[status] || { variant: 'outline', icon: AlertTriangle };
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            AI Sensor Optimization
          </h1>
          <p className="text-muted-foreground mt-1">
            Analyze sensor data and get AI-powered parameter tuning recommendations
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="statistical" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Statistical Analysis
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2">
            <Sparkles className="h-4 w-4" />
            AI Recommendations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="statistical" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Statistical Threshold Optimization
              </CardTitle>
              <CardDescription>
                Analyze historical sensor data to recommend optimal warning and critical thresholds
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Select Equipment to Analyze</label>
                  <Select
                    value={selectedEquipment}
                    onValueChange={setSelectedEquipment}
                    disabled={equipmentLoading}
                  >
                    <SelectTrigger data-testid="select-equipment">
                      <SelectValue placeholder="Choose equipment..." />
                    </SelectTrigger>
                    <SelectContent>
                      {equipment.map((eq) => (
                        <SelectItem key={eq.id} value={eq.id} data-testid={`equipment-option-${eq.id}`}>
                          {eq.name} ({eq.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => selectedEquipment && analyzeMutation.mutate(selectedEquipment)}
                  disabled={!selectedEquipment || analyzeMutation.isPending}
                  data-testid="button-analyze"
                >
                  {analyzeMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Run Analysis
                    </>
                  )}
                </Button>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Analysis uses 30 days of historical data. Requires minimum 100 sensor readings for accurate recommendations.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pending Recommendations</CardTitle>
              <CardDescription>Review and apply statistical threshold optimizations</CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : statisticalRecs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No recommendations available. Run an analysis to generate recommendations.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Equipment</TableHead>
                      <TableHead>Sensor Type</TableHead>
                      <TableHead>Current Threshold</TableHead>
                      <TableHead>Recommended Threshold</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statisticalRecs.map((rec) => (
                      <TableRow key={rec.id}>
                        <TableCell className="font-medium">
                          {equipment.find(e => e.id === rec.equipmentId)?.name || rec.equipmentId}
                        </TableCell>
                        <TableCell>{rec.sensorType}</TableCell>
                        <TableCell>
                          {rec.currentThresholds?.critical || rec.currentThresholds?.warning || 'N/A'}
                        </TableCell>
                        <TableCell className="font-semibold text-primary">
                          {rec.optimizedThresholds?.critical || rec.optimizedThresholds?.warning || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {getConfidenceBadge(rec.metadata?.confidence >= 80 ? 'high' : rec.metadata?.confidence >= 50 ? 'medium' : 'low')}
                        </TableCell>
                        <TableCell>{getStatusBadge(rec.status)}</TableCell>
                        <TableCell>
                          {rec.status === 'pending_review' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => applyOptimizationMutation.mutate(rec.id)}
                                disabled={applyOptimizationMutation.isPending}
                                data-testid={`button-apply-${rec.id}`}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Apply
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => rejectOptimizationMutation.mutate({ id: rec.id, reason: 'User rejected' })}
                                disabled={rejectOptimizationMutation.isPending}
                                data-testid={`button-reject-${rec.id}`}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
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

        <TabsContent value="ai" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI Parameter Recommendations
              </CardTitle>
              <CardDescription>
                Get equipment-specific sensor configuration recommendations from AI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Select Equipment</label>
                  <Select
                    value={selectedEquipment}
                    onValueChange={setSelectedEquipment}
                    disabled={equipmentLoading}
                  >
                    <SelectTrigger data-testid="select-ai-equipment">
                      <SelectValue placeholder="Choose equipment..." />
                    </SelectTrigger>
                    <SelectContent>
                      {equipment.map((eq) => (
                        <SelectItem key={eq.id} value={eq.id} data-testid={`ai-equipment-option-${eq.id}`}>
                          {eq.name} ({eq.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => refetchAI()}
                  disabled={!selectedEquipment || aiLoading}
                  data-testid="button-get-ai-recommendations"
                >
                  {aiLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Brain className="mr-2 h-4 w-4" />
                      Get AI Recommendations
                    </>
                  )}
                </Button>
              </div>

              <Alert>
                <Brain className="h-4 w-4" />
                <AlertDescription>
                  AI recommendations are based on manufacturer specifications, industry standards (ISO, IMO), and marine operating conditions.
                </AlertDescription>
              </Alert>

              {aiError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {String(aiError).includes('503') || String(aiError).includes('AI_SERVICE_UNAVAILABLE')
                      ? "AI service unavailable. Please configure OpenAI API key to use AI recommendations."
                      : "Failed to load AI recommendations. Please try again."}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {selectedEquipment && aiRecommendations?.recommendations && (
            <div className="space-y-4">
              {aiRecommendations.recommendations.map((rec) => (
                <Card key={rec.sensorType}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Settings className="h-5 w-5" />
                          {rec.sensorType}
                        </CardTitle>
                        <CardDescription className="mt-1">{rec.reasoning}</CardDescription>
                      </div>
                      {getConfidenceBadge(rec.confidence)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(rec.parameters).map(([key, value]) => (
                        value !== null && value !== undefined && (
                          <div key={key} className="p-3 bg-muted rounded-lg">
                            <div className="text-xs text-muted-foreground uppercase">{key}</div>
                            <div className="text-lg font-semibold mt-1">{value}</div>
                          </div>
                        )
                      ))}
                    </div>

                    {rec.sources.length > 0 && (
                      <div className="pt-4 border-t">
                        <div className="text-sm font-medium mb-2">Sources:</div>
                        <div className="flex flex-wrap gap-2">
                          {rec.sources.map((source, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {source}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={() => applyAIRecommendationMutation.mutate({
                          equipmentId: selectedEquipment,
                          sensorType: rec.sensorType,
                          parameters: rec.parameters,
                        })}
                        disabled={applyAIRecommendationMutation.isPending}
                        data-testid={`button-apply-ai-${rec.sensorType}`}
                      >
                        {applyAIRecommendationMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                        )}
                        Apply AI Settings
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {selectedEquipment && aiLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
            </div>
          )}

          {selectedEquipment && !aiLoading && (!aiRecommendations || aiRecommendations.recommendations?.length === 0) && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No AI recommendations available for this equipment.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
