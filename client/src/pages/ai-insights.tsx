import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
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
  Info,
  ChevronDown
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
    analysis: string;
    confidence: number;
    scenarios?: Array<{
      scenario: string;
      probability: number;
      impact: 'low' | 'medium' | 'high' | 'critical';
      recommendations: string[];
    }>;
    roi?: {
      estimatedSavings: number;
      investmentRequired: number;
      paybackPeriod: number;
      riskReduction: number;
    };
    citations?: Array<{
      source: string;
      relevance: number;
      snippet: string;
    }>;
    metadata: {
      model: string;
      provider: string;
      processingTime: number;
      tokensUsed?: number;
    };
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

// Custom hook to get and track search params
function useSearchParams() {
  const [searchParams, setSearchParams] = useState(() => new URLSearchParams(window.location.search));
  
  useEffect(() => {
    const checkForChanges = () => {
      const newParams = new URLSearchParams(window.location.search);
      const newParamString = newParams.toString();
      const currentParamString = searchParams.toString();
      
      if (newParamString !== currentParamString) {
        setSearchParams(newParams);
      }
    };

    // Check for changes periodically (lightweight approach)
    const intervalId = setInterval(checkForChanges, 100);

    // Also check on popstate (browser back/forward)
    window.addEventListener('popstate', checkForChanges);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('popstate', checkForChanges);
    };
  }, [searchParams]);

  return searchParams;
}

export default function AIInsights() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  
  const [reportType, setReportType] = useState<ReportType>("health");
  const [audience, setAudience] = useState<AudienceType>("executive");
  const [selectedModel, setSelectedModel] = useState<ModelType>("gpt-4o");
  const [selectedVessel, setSelectedVessel] = useState<string>("");
  const [selectedEquipment, setSelectedEquipment] = useState<string>("");
  const [generatedReport, setGeneratedReport] = useState<GeneratedReport | null>(null);
  const [vesselIntelligence, setVesselIntelligence] = useState<VesselIntelligence | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingIntelligence, setIsLoadingIntelligence] = useState(false);
  
  // Collapsible section states - only Analysis open by default
  const [openSections, setOpenSections] = useState({
    analysis: true,
    scenarios: false,
    roi: false,
    citations: false
  });

  // Update report type when URL query parameter changes
  useEffect(() => {
    const typeParam = searchParams.get('type') as ReportType | null;
    const validTypes: ReportType[] = ["health", "fleet", "maintenance", "compliance"];
    
    if (typeParam && validTypes.includes(typeParam)) {
      setReportType(typeParam);
    } else {
      // Reset to default when no type param is present or invalid
      setReportType("health");
    }
  }, [searchParams]);

  // Set document title
  useEffect(() => {
    document.title = "AI Insights - ARUS";
    return () => {
      document.title = "ARUS - Marine Predictive Maintenance";
    };
  }, []);

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

      const response = await apiRequest("POST", endpoint, requestBody);

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
        description: response.report.analysis ? `${response.report.analysis.substring(0, 100)}...` : "Report successfully generated",
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
    <div className="min-h-screen bg-background p-4 sm:p-6 space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold">AI Insights</h1>
        </div>
        <Badge variant="outline" className="text-xs">
          <Sparkles className="h-3 w-3 mr-1" />
          Multi-Model AI
        </Badge>
      </div>

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
            <div className="space-y-4">
            {/* Consolidated Filter Row */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex-1 min-w-[200px] space-y-1.5">
                    <Label className="text-xs font-medium">Report Type</Label>
                    <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                      <SelectTrigger className="h-9" data-testid="select-report-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="health">Health Report</SelectItem>
                        <SelectItem value="fleet">Fleet Summary</SelectItem>
                        <SelectItem value="maintenance">Maintenance Report</SelectItem>
                        <SelectItem value="compliance">Compliance Report</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1 min-w-[180px] space-y-1.5">
                    <Label className="text-xs font-medium">Vessel</Label>
                    <Select value={selectedVessel} onValueChange={setSelectedVessel}>
                      <SelectTrigger className="h-9" data-testid="select-vessel">
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

                  <div className="flex-1 min-w-[160px] space-y-1.5">
                    <Label className="text-xs font-medium">Audience</Label>
                    <Select value={audience} onValueChange={(v) => setAudience(v as AudienceType)}>
                      <SelectTrigger className="h-9" data-testid="select-audience">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {audiences.map((aud) => (
                          <SelectItem key={aud.id} value={aud.id}>
                            {aud.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1 min-w-[140px] space-y-1.5">
                    <Label className="text-xs font-medium">AI Model</Label>
                    <Select value={selectedModel} onValueChange={(v) => setSelectedModel(v as ModelType)}>
                      <SelectTrigger className="h-9" data-testid="select-model">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {models.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.recommended && <Sparkles className="h-3 w-3 mr-1 inline text-yellow-500" />}
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    onClick={generateReport} 
                    disabled={isGenerating || (reportType !== "fleet" && !selectedVessel)}
                    className="h-9"
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
                        Generate
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Report Results */}
            <Card>
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
                        {/* Metadata */}
                        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                          <Badge variant="outline" className="text-xs sm:text-sm">
                            Confidence: {Math.round(generatedReport.content.confidence * 100)}%
                          </Badge>
                          <Badge variant="secondary" className="text-xs sm:text-sm">
                            {generatedReport.audience.charAt(0).toUpperCase() + generatedReport.audience.slice(1)}
                          </Badge>
                          <Badge variant="outline" className="text-xs sm:text-sm">
                            {generatedReport.content.metadata.model} ({generatedReport.content.metadata.provider})
                          </Badge>
                          <Badge variant="outline" className="text-xs sm:text-sm">
                            {generatedReport.content.metadata.processingTime}ms
                          </Badge>
                        </div>

                        {/* Analysis - Collapsible */}
                        <Collapsible open={openSections.analysis} onOpenChange={(open) => setOpenSections(prev => ({ ...prev, analysis: open }))}>
                          <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-70 transition-opacity">
                            <h3 className="font-semibold text-sm sm:text-base">AI Analysis</h3>
                            <ChevronDown className={`h-4 w-4 transition-transform ${openSections.analysis ? 'rotate-180' : ''}`} />
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pt-2">
                            <div className="text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap">
                              {generatedReport.content.analysis}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>

                        {/* Scenarios - Collapsible */}
                        {generatedReport.content.scenarios && generatedReport.content.scenarios.length > 0 && (
                          <Collapsible open={openSections.scenarios} onOpenChange={(open) => setOpenSections(prev => ({ ...prev, scenarios: open }))}>
                            <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-70 transition-opacity mb-3">
                              <h3 className="font-semibold text-sm sm:text-base">Scenario Analysis ({generatedReport.content.scenarios.length})</h3>
                              <ChevronDown className={`h-4 w-4 transition-transform ${openSections.scenarios ? 'rotate-180' : ''}`} />
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                            <div className="space-y-3 sm:space-y-4">
                              {generatedReport.content.scenarios.map((scenario, idx) => (
                                <Card key={idx} className="border-l-4" style={{
                                  borderLeftColor: scenario.impact === 'critical' ? '#ef4444' : 
                                                  scenario.impact === 'high' ? '#f97316' :
                                                  scenario.impact === 'medium' ? '#eab308' : '#3b82f6'
                                }}>
                                  <CardContent className="pt-4">
                                    <div className="flex items-start gap-2 mb-2">
                                      <Badge variant="outline" className="text-xs">
                                        {scenario.impact.toUpperCase()}
                                      </Badge>
                                      <Badge variant="secondary" className="text-xs">
                                        {Math.round(scenario.probability * 100)}% probability
                                      </Badge>
                                    </div>
                                    <p className="font-medium mb-2 text-sm sm:text-base">{scenario.scenario}</p>
                                    {scenario.recommendations.length > 0 && (
                                      <ul className="space-y-1 mt-2">
                                        {scenario.recommendations.map((rec, recIdx) => (
                                          <li key={recIdx} className="flex items-start gap-2">
                                            <CheckCircle2 className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                                            <span className="text-xs sm:text-sm text-muted-foreground">{rec}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                            </CollapsibleContent>
                          </Collapsible>
                        )}

                        {/* ROI Analysis - Collapsible */}
                        {generatedReport.content.roi && (
                          <Collapsible open={openSections.roi} onOpenChange={(open) => setOpenSections(prev => ({ ...prev, roi: open }))}>
                            <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-70 transition-opacity mb-3">
                              <h3 className="font-semibold text-sm sm:text-base">ROI Analysis</h3>
                              <ChevronDown className={`h-4 w-4 transition-transform ${openSections.roi ? 'rotate-180' : ''}`} />
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                              <Card>
                                <CardContent className="pt-4">
                                  <p className="text-xs text-muted-foreground mb-1">Estimated Savings</p>
                                  <p className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400">
                                    ${generatedReport.content.roi.estimatedSavings.toLocaleString()}
                                  </p>
                                </CardContent>
                              </Card>
                              <Card>
                                <CardContent className="pt-4">
                                  <p className="text-xs text-muted-foreground mb-1">Investment Required</p>
                                  <p className="text-lg sm:text-xl font-bold">
                                    ${generatedReport.content.roi.investmentRequired.toLocaleString()}
                                  </p>
                                </CardContent>
                              </Card>
                              <Card>
                                <CardContent className="pt-4">
                                  <p className="text-xs text-muted-foreground mb-1">Payback Period</p>
                                  <p className="text-lg sm:text-xl font-bold">
                                    {generatedReport.content.roi.paybackPeriod} months
                                  </p>
                                </CardContent>
                              </Card>
                              <Card>
                                <CardContent className="pt-4">
                                  <p className="text-xs text-muted-foreground mb-1">Risk Reduction</p>
                                  <p className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400">
                                    {Math.round(generatedReport.content.roi.riskReduction * 100)}%
                                  </p>
                                </CardContent>
                              </Card>
                            </div>
                            </CollapsibleContent>
                          </Collapsible>
                        )}

                        {/* Citations - Collapsible */}
                        {generatedReport.content.citations && generatedReport.content.citations.length > 0 && (
                          <Collapsible open={openSections.citations} onOpenChange={(open) => setOpenSections(prev => ({ ...prev, citations: open }))}>
                            <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-70 transition-opacity mb-3">
                              <h3 className="font-semibold text-sm sm:text-base">Sources & Citations ({generatedReport.content.citations.length})</h3>
                              <ChevronDown className={`h-4 w-4 transition-transform ${openSections.citations ? 'rotate-180' : ''}`} />
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                            <div className="space-y-2">
                              {generatedReport.content.citations.map((citation, idx) => (
                                <Card key={idx}>
                                  <CardContent className="pt-3 pb-3">
                                    <div className="flex items-start gap-2">
                                      <Badge variant="outline" className="text-xs">
                                        {Math.round(citation.relevance * 100)}%
                                      </Badge>
                                      <div className="flex-1">
                                        <p className="font-medium text-xs sm:text-sm mb-1">{citation.source}</p>
                                        <p className="text-xs text-muted-foreground">{citation.snippet}</p>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                            </CollapsibleContent>
                          </Collapsible>
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
  );
}
