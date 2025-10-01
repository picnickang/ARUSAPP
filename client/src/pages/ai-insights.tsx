import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Brain, 
  FileText, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles,
  Ship,
  Wrench,
  Shield,
  Zap,
  Activity,
  BarChart3,
  Loader2,
  Info
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type ReportType = "health" | "fleet" | "maintenance" | "compliance";
type AudienceType = "executive" | "technical" | "maintenance" | "compliance";
type ModelType = "gpt-4o" | "o1" | "claude-3-5-sonnet";

interface AIModel {
  id: string;
  provider: string;
  name: string;
  description: string;
  capabilities: string[];
  recommended: boolean;
}

interface Audience {
  id: string;
  name: string;
  description: string;
}

interface GeneratedReport {
  reportType: ReportType;
  audience: AudienceType;
  model: ModelType;
  content: {
    summary: string;
    keyFindings: string[];
    recommendations: Array<{
      priority: "critical" | "high" | "medium" | "low";
      action: string;
      rationale: string;
      estimatedImpact: string;
    }>;
    metrics?: Record<string, any>;
    scenarios?: {
      best: string;
      expected: string;
      worst: string;
    };
    riskMatrix?: Array<{
      risk: string;
      likelihood: string;
      impact: string;
      mitigation: string;
    }>;
    confidence: number;
  };
  timestamp: string;
}

interface VesselIntelligence {
  vesselId: string;
  vesselName: string;
  patterns: {
    historicalPatterns: Array<{
      pattern: string;
      frequency: string;
      lastOccurrence: string;
      significance: string;
    }>;
    anomalies: Array<{
      type: string;
      severity: "low" | "medium" | "high" | "critical";
      detectedAt: string;
      description: string;
      zScore: number;
    }>;
    seasonalTrends: Array<{
      season: string;
      trend: string;
      impact: string;
    }>;
    equipmentCorrelations: Array<{
      equipment1: string;
      equipment2: string;
      correlationType: string;
      strength: number;
    }>;
  };
  predictions: {
    failureRisk: number;
    nextMaintenanceWindow: string;
    criticalEquipment: string[];
  };
  confidence: number;
}

export default function AIInsights() {
  const { toast } = useToast();
  const [reportType, setReportType] = useState<ReportType>("health");
  const [audience, setAudience] = useState<AudienceType>("executive");
  const [selectedModel, setSelectedModel] = useState<ModelType>("gpt-4o");
  const [selectedVessel, setSelectedVessel] = useState<string>("");
  const [selectedEquipment, setSelectedEquipment] = useState<string>("");
  const [generatedReport, setGeneratedReport] = useState<GeneratedReport | null>(null);
  const [vesselIntelligence, setVesselIntelligence] = useState<VesselIntelligence | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingIntelligence, setIsLoadingIntelligence] = useState(false);

  // Fetch available models and audiences
  const { data: modelsData } = useQuery({
    queryKey: ["/api/llm/models"],
  });

  // Fetch vessels
  const { data: vessels = [] } = useQuery({
    queryKey: ["/api/vessels"],
  });

  // Fetch equipment
  const { data: equipment = [] } = useQuery({
    queryKey: ["/api/equipment/health"],
  });

  const models: AIModel[] = modelsData?.models || [];
  const audiences: Audience[] = modelsData?.audiences || [];

  const generateReport = async () => {
    if (!selectedVessel && reportType !== "fleet") {
      toast({
        title: "Vessel Required",
        description: "Please select a vessel to generate a report",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      // Map report type to correct endpoint
      const endpointMap: Record<ReportType, string> = {
        health: "/api/llm/reports/vessel-health",
        fleet: "/api/llm/reports/fleet-summary",
        maintenance: "/api/llm/reports/maintenance",
        compliance: "/api/llm/reports/compliance",
      };

      const endpoint = endpointMap[reportType];
      const requestBody: any = {
        audience,
        includeScenarios: true,
        includeROI: reportType === "health" || reportType === "fleet",
        modelPreference: selectedModel,
      };

      // Add vesselId for vessel-specific reports
      if (reportType !== "fleet") {
        requestBody.vesselId = selectedVessel;
      }

      const response = await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      if (!response.success) {
        throw new Error(response.error || "Failed to generate report");
      }

      setGeneratedReport({
        reportType,
        audience,
        model: selectedModel,
        content: response.report,
        timestamp: new Date().toISOString(),
      });

      toast({
        title: "Report Generated",
        description: `${response.report.summary}`,
      });
    } catch (error: any) {
      toast({
        title: "Report Generation Failed",
        description: error.message || "Failed to generate AI report",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const loadVesselIntelligence = async () => {
    if (!selectedVessel) {
      toast({
        title: "Vessel Required",
        description: "Please select a vessel to analyze",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingIntelligence(true);
    try {
      const response = await fetch(`/api/llm/vessel/${selectedVessel}/intelligence?lookbackDays=365`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to load vessel intelligence");
      }

      setVesselIntelligence(data.intelligence);

      toast({
        title: "Intelligence Loaded",
        description: `Analyzed patterns for ${data.intelligence.vesselName}`,
      });
    } catch (error: any) {
      toast({
        title: "Intelligence Load Failed",
        description: error.message || "Failed to load vessel intelligence",
        variant: "destructive",
      });
    } finally {
      setIsLoadingIntelligence(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "destructive";
      case "high": return "default";
      case "medium": return "secondary";
      case "low": return "outline";
      default: return "outline";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "text-red-500";
      case "high": return "text-orange-500";
      case "medium": return "text-yellow-500";
      case "low": return "text-blue-500";
      default: return "text-gray-500";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 sm:h-16 items-center gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2 flex-1">
            <Brain className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            <div className="flex flex-col">
              <h1 className="text-base sm:text-lg font-semibold leading-none">AI Insights</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Enhanced LLM & Vessel Intelligence</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            <span className="hidden sm:inline">Multi-Model AI</span>
            <span className="sm:hidden">AI</span>
          </Badge>
        </div>
      </header>

      <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Model Information Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs sm:text-sm">
            Powered by {models.find(m => m.id === selectedModel)?.name || "AI"} with automatic fallback support. 
            <span className="hidden sm:inline"> Reports are personalized for different stakeholder audiences with confidence scoring and scenario analysis.</span>
          </AlertDescription>
        </Alert>

        {/* Main Tabs */}
        <Tabs defaultValue="reports" className="w-full">
          <div className="overflow-x-auto">
            <TabsList className="inline-flex w-full min-w-fit p-1 gap-1">
              <TabsTrigger value="reports" className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px]" data-testid="tab-reports">
                <FileText className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">AI Reports</span>
                <span className="sm:hidden">Reports</span>
              </TabsTrigger>
              <TabsTrigger value="intelligence" className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px]" data-testid="tab-intelligence">
                <Brain className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Vessel Intelligence</span>
                <span className="sm:hidden">Intelligence</span>
              </TabsTrigger>
              <TabsTrigger value="equipment" className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px]" data-testid="tab-equipment">
                <Wrench className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Equipment Analysis</span>
                <span className="sm:hidden">Equipment</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* AI Reports Tab */}
          <TabsContent value="reports" className="space-y-4 mt-4">
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
              {/* Report Configuration */}
              <Card className="lg:col-span-1">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base sm:text-lg">Report Configuration</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Configure AI report parameters</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-medium">Report Type</label>
                    <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                      <SelectTrigger className="min-h-[44px]" data-testid="select-report-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="health">
                          <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4" />
                            Health Report
                          </div>
                        </SelectItem>
                        <SelectItem value="fleet">
                          <div className="flex items-center gap-2">
                            <Ship className="h-4 w-4" />
                            Fleet Summary
                          </div>
                        </SelectItem>
                        <SelectItem value="maintenance">
                          <div className="flex items-center gap-2">
                            <Wrench className="h-4 w-4" />
                            Maintenance Report
                          </div>
                        </SelectItem>
                        <SelectItem value="compliance">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Compliance Report
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-medium">Target Audience</label>
                    <Select value={audience} onValueChange={(v) => setAudience(v as AudienceType)}>
                      <SelectTrigger className="min-h-[44px]" data-testid="select-audience">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {audiences.map((aud) => (
                          <SelectItem key={aud.id} value={aud.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{aud.name}</span>
                              <span className="text-xs text-muted-foreground">{aud.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-medium">AI Model</label>
                    <Select value={selectedModel} onValueChange={(v) => setSelectedModel(v as ModelType)}>
                      <SelectTrigger className="min-h-[44px]" data-testid="select-model">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {models.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            <div className="flex items-center gap-2">
                              {model.recommended && <Sparkles className="h-3 w-3 text-yellow-500" />}
                              <div className="flex flex-col">
                                <span className="font-medium">{model.name}</span>
                                <span className="text-xs text-muted-foreground">{model.provider}</span>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-medium">Vessel</label>
                    <Select value={selectedVessel} onValueChange={setSelectedVessel}>
                      <SelectTrigger className="min-h-[44px]" data-testid="select-vessel">
                        <SelectValue placeholder="Select vessel" />
                      </SelectTrigger>
                      <SelectContent>
                        {vessels.map((vessel: any) => (
                          <SelectItem key={vessel.id} value={vessel.id}>
                            {vessel.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {reportType === "fleet" && (
                      <p className="text-xs text-muted-foreground">
                        Vessel selection is optional for fleet summary reports
                      </p>
                    )}
                  </div>

                  <Separator />

                  <Button 
                    onClick={generateReport} 
                    disabled={isGenerating || (reportType !== "fleet" && !selectedVessel)}
                    className="w-full min-h-[44px]"
                    data-testid="button-generate-report"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-4 w-4" />
                        Generate AI Report
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Report Results */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base sm:text-lg">AI-Generated Report</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    {generatedReport ? `Generated ${new Date(generatedReport.timestamp).toLocaleString()}` : "Configure and generate a report"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!generatedReport ? (
                    <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
                      <FileText className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mb-4" />
                      <p className="text-sm sm:text-base text-muted-foreground">
                        No report generated yet. Configure parameters and click "Generate AI Report"
                      </p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px] sm:h-[600px]">
                      <div className="space-y-4 sm:space-y-6 pr-4">
                        {/* Confidence Score */}
                        <div className="flex items-center gap-2 sm:gap-4">
                          <Badge variant="outline" className="text-xs sm:text-sm">
                            Confidence: {generatedReport.content.confidence}%
                          </Badge>
                          <Badge variant="secondary" className="text-xs sm:text-sm">
                            {generatedReport.audience.charAt(0).toUpperCase() + generatedReport.audience.slice(1)}
                          </Badge>
                        </div>

                        {/* Summary */}
                        <div>
                          <h3 className="font-semibold mb-2 text-sm sm:text-base">Executive Summary</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground">{generatedReport.content.summary}</p>
                        </div>

                        {/* Key Findings */}
                        <div>
                          <h3 className="font-semibold mb-2 text-sm sm:text-base">Key Findings</h3>
                          <ul className="space-y-1 sm:space-y-2">
                            {generatedReport.content.keyFindings.map((finding, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                <span className="text-xs sm:text-sm">{finding}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Recommendations */}
                        <div>
                          <h3 className="font-semibold mb-3 text-sm sm:text-base">Recommendations</h3>
                          <div className="space-y-3 sm:space-y-4">
                            {generatedReport.content.recommendations.map((rec, idx) => (
                              <Card key={idx} className="border-l-4" style={{
                                borderLeftColor: rec.priority === 'critical' ? '#ef4444' : 
                                                rec.priority === 'high' ? '#f97316' :
                                                rec.priority === 'medium' ? '#eab308' : '#3b82f6'
                              }}>
                                <CardContent className="pt-4">
                                  <div className="flex items-start gap-2 mb-2">
                                    <Badge variant={getPriorityColor(rec.priority) as any} className="text-xs">
                                      {rec.priority.toUpperCase()}
                                    </Badge>
                                  </div>
                                  <p className="font-medium mb-2 text-sm sm:text-base">{rec.action}</p>
                                  <p className="text-xs sm:text-sm text-muted-foreground mb-2">{rec.rationale}</p>
                                  <p className="text-xs sm:text-sm font-medium text-primary">
                                    Impact: {rec.estimatedImpact}
                                  </p>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>

                        {/* Scenarios */}
                        {generatedReport.content.scenarios && (
                          <div>
                            <h3 className="font-semibold mb-3 text-sm sm:text-base">Scenario Analysis</h3>
                            <div className="space-y-2 sm:space-y-3">
                              <div className="p-3 sm:p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                                <p className="font-medium text-green-900 dark:text-green-100 mb-1 text-xs sm:text-sm">Best Case</p>
                                <p className="text-xs sm:text-sm text-green-700 dark:text-green-300">{generatedReport.content.scenarios.best}</p>
                              </div>
                              <div className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                                <p className="font-medium text-blue-900 dark:text-blue-100 mb-1 text-xs sm:text-sm">Expected Case</p>
                                <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">{generatedReport.content.scenarios.expected}</p>
                              </div>
                              <div className="p-3 sm:p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                                <p className="font-medium text-orange-900 dark:text-orange-100 mb-1 text-xs sm:text-sm">Worst Case</p>
                                <p className="text-xs sm:text-sm text-orange-700 dark:text-orange-300">{generatedReport.content.scenarios.worst}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Risk Matrix */}
                        {generatedReport.content.riskMatrix && generatedReport.content.riskMatrix.length > 0 && (
                          <div>
                            <h3 className="font-semibold mb-3 text-sm sm:text-base">Risk Matrix</h3>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs sm:text-sm">
                                <thead>
                                  <tr className="border-b">
                                    <th className="text-left p-2">Risk</th>
                                    <th className="text-left p-2 hidden sm:table-cell">Likelihood</th>
                                    <th className="text-left p-2">Impact</th>
                                    <th className="text-left p-2 hidden md:table-cell">Mitigation</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {generatedReport.content.riskMatrix.map((risk, idx) => (
                                    <tr key={idx} className="border-b">
                                      <td className="p-2">{risk.risk}</td>
                                      <td className="p-2 hidden sm:table-cell">{risk.likelihood}</td>
                                      <td className="p-2">{risk.impact}</td>
                                      <td className="p-2 hidden md:table-cell">{risk.mitigation}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Vessel Intelligence Tab */}
          <TabsContent value="intelligence" className="space-y-4 mt-4">
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
              {/* Intelligence Configuration */}
              <Card className="lg:col-span-1">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base sm:text-lg">Vessel Intelligence</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">AI-powered pattern analysis</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-medium">Select Vessel</label>
                    <Select value={selectedVessel} onValueChange={setSelectedVessel}>
                      <SelectTrigger className="min-h-[44px]" data-testid="select-vessel-intelligence">
                        <SelectValue placeholder="Select vessel" />
                      </SelectTrigger>
                      <SelectContent>
                        {vessels.map((vessel: any) => (
                          <SelectItem key={vessel.id} value={vessel.id}>
                            {vessel.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    onClick={loadVesselIntelligence} 
                    disabled={isLoadingIntelligence || !selectedVessel}
                    className="w-full min-h-[44px]"
                    data-testid="button-load-intelligence"
                  >
                    {isLoadingIntelligence ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Brain className="mr-2 h-4 w-4" />
                        Analyze Vessel
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Intelligence Results */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base sm:text-lg">Intelligence Analysis</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    {vesselIntelligence ? `Analysis for ${vesselIntelligence.vesselName}` : "Select a vessel to analyze"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!vesselIntelligence ? (
                    <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
                      <Brain className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mb-4" />
                      <p className="text-sm sm:text-base text-muted-foreground">
                        No intelligence data loaded. Select a vessel and click "Analyze Vessel"
                      </p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px] sm:h-[600px]">
                      <div className="space-y-4 sm:space-y-6 pr-4">
                        {/* Confidence & Predictions */}
                        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                          <Card>
                            <CardContent className="pt-4 sm:pt-6">
                              <div className="text-xl sm:text-2xl font-bold">{vesselIntelligence.confidence}%</div>
                              <p className="text-xs sm:text-sm text-muted-foreground">Analysis Confidence</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="pt-4 sm:pt-6">
                              <div className="text-xl sm:text-2xl font-bold">{vesselIntelligence.predictions.failureRisk}%</div>
                              <p className="text-xs sm:text-sm text-muted-foreground">Failure Risk Score</p>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Anomalies */}
                        {vesselIntelligence.patterns.anomalies.length > 0 && (
                          <div>
                            <h3 className="font-semibold mb-3 text-sm sm:text-base flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4" />
                              Detected Anomalies
                            </h3>
                            <div className="space-y-2 sm:space-y-3">
                              {vesselIntelligence.patterns.anomalies.map((anomaly, idx) => (
                                <Card key={idx}>
                                  <CardContent className="pt-4">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <p className="font-medium text-sm sm:text-base">{anomaly.type}</p>
                                      <Badge variant="outline" className={`${getSeverityColor(anomaly.severity)} text-xs`}>
                                        {anomaly.severity}
                                      </Badge>
                                    </div>
                                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">{anomaly.description}</p>
                                    <div className="flex items-center gap-3 sm:gap-4 text-xs text-muted-foreground">
                                      <span>Z-Score: {anomaly.zScore.toFixed(2)}</span>
                                      <span>{new Date(anomaly.detectedAt).toLocaleDateString()}</span>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Historical Patterns */}
                        {vesselIntelligence.patterns.historicalPatterns.length > 0 && (
                          <div>
                            <h3 className="font-semibold mb-3 text-sm sm:text-base flex items-center gap-2">
                              <BarChart3 className="h-4 w-4" />
                              Historical Patterns
                            </h3>
                            <div className="space-y-2">
                              {vesselIntelligence.patterns.historicalPatterns.map((pattern, idx) => (
                                <div key={idx} className="p-3 bg-muted rounded-lg">
                                  <p className="font-medium text-sm sm:text-base mb-1">{pattern.pattern}</p>
                                  <div className="flex flex-wrap gap-2 sm:gap-4 text-xs text-muted-foreground">
                                    <span>Frequency: {pattern.frequency}</span>
                                    <span>Last: {pattern.lastOccurrence}</span>
                                    <span>Significance: {pattern.significance}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Equipment Correlations */}
                        {vesselIntelligence.patterns.equipmentCorrelations.length > 0 && (
                          <div>
                            <h3 className="font-semibold mb-3 text-sm sm:text-base flex items-center gap-2">
                              <TrendingUp className="h-4 w-4" />
                              Equipment Correlations
                            </h3>
                            <div className="space-y-2">
                              {vesselIntelligence.patterns.equipmentCorrelations.map((corr, idx) => (
                                <div key={idx} className="p-3 bg-muted rounded-lg">
                                  <p className="font-medium text-xs sm:text-sm mb-1">
                                    {corr.equipment1} ↔ {corr.equipment2}
                                  </p>
                                  <div className="flex gap-4 text-xs text-muted-foreground">
                                    <span>Type: {corr.correlationType}</span>
                                    <span>Strength: {(corr.strength * 100).toFixed(0)}%</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Equipment Analysis Tab */}
          <TabsContent value="equipment" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">AI Equipment Analysis</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Coming soon - AI-powered equipment health analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
                  <Wrench className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mb-4" />
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Equipment analysis feature will be available soon
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
