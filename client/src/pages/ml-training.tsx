import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useCustomMutation } from "@/hooks/useCrudMutations";
import { 
  Brain, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Activity,
  Radio,
  Play,
  Database,
  Info,
  FileJson,
  Download,
  FileSpreadsheet
} from "lucide-react";

interface TrainingWindowConfig {
  lookbackDays: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  confidenceMultiplier: number;
  warnings: string[];
  recommendations: string[];
  metadata: {
    availableDays: number;
    usedDays: number;
    failureCount: number;
    equipmentType: string;
  };
}

interface MlModel {
  id: string;
  orgId: string;
  name: string;
  version: string;
  modelType: string;
  targetEquipmentType?: string;
  status: string;
  deployedAt?: string;
  performance?: {
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1Score?: number;
    loss?: number;
  };
  hyperparameters?: {
    lookbackDays?: number;
    dataQualityTier?: 'bronze' | 'silver' | 'gold' | 'platinum';
    confidenceMultiplier?: number;
    availableDays?: number;
  };
  createdAt: string;
}

export default function MLTrainingPage() {
  const { toast } = useToast();
  const [orgId] = useState("default-org-id");
  const [selectedEquipmentType, setSelectedEquipmentType] = useState<string>("");

  const { data: mlModels = [], isLoading: isLoadingModels, refetch: refetchModels } = useQuery({
    queryKey: ["/api/analytics/ml-models", orgId],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/analytics/ml-models?orgId=${orgId}`);
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Error fetching ML models:", error);
        return [];
      }
    },
  });

  const { data: equipment = [] } = useQuery<any[]>({
    queryKey: ["/api/equipment"],
  });

  const trainLSTM = useCustomMutation({
    mutationFn: async (params: { equipmentType?: string; epochs?: number; sequenceLength?: number }) => {
      const config = {
        orgId,
        equipmentType: params.equipmentType || undefined,
        lstmConfig: {
          sequenceLength: params.sequenceLength || 10,
          featureCount: 0,
          lstmUnits: 64,
          dropoutRate: 0.2,
          learningRate: 0.001,
          epochs: params.epochs || 50,
          batchSize: 32
        }
      };
      
      return await apiRequest("POST", "/api/ml/train/lstm", config);
    },
    invalidateKeys: [["/api/analytics/ml-models"]],
    successMessage: (data) => `Model trained successfully with ${(data.metrics.accuracy * 100).toFixed(1)}% accuracy`,
    errorMessage: (error: any) => error.message || "Training failed",
    onSuccess: () => {
      refetchModels();
    },
  });

  const trainRandomForest = useCustomMutation({
    mutationFn: async (params: { equipmentType?: string; numTrees?: number }) => {
      const config = {
        orgId,
        equipmentType: params.equipmentType || undefined,
        rfConfig: {
          numTrees: params.numTrees || 50,
          maxDepth: 10,
          minSamplesSplit: 5,
          maxFeatures: 8,
          bootstrapSampleRatio: 0.8
        }
      };
      
      return await apiRequest("POST", "/api/ml/train/random-forest", config);
    },
    invalidateKeys: [["/api/analytics/ml-models"]],
    successMessage: (data) => `Model trained successfully with ${(data.metrics.accuracy * 100).toFixed(1)}% accuracy`,
    errorMessage: (error: any) => error.message || "Training failed",
    onSuccess: () => {
      refetchModels();
    },
  });

  const [acousticData, setAcousticData] = useState("");
  const [sampleRate, setSampleRate] = useState("44100");
  const [rpm, setRpm] = useState("");
  const [acousticResults, setAcousticResults] = useState<any>(null);

  const analyzeAcoustic = useCustomMutation({
    mutationFn: async () => {
      const data = acousticData.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
      
      if (data.length === 0) {
        throw new Error("Invalid acoustic data. Please provide comma-separated numbers.");
      }
      
      return await apiRequest("POST", "/api/acoustic/analyze", {
        acousticData: data,
        sampleRate: parseInt(sampleRate),
        rpm: rpm ? parseFloat(rpm) : undefined
      });
    },
    successMessage: (data) => `Health score: ${data.healthScore?.toFixed(0)}% - ${data.severity} severity`,
    errorMessage: (error: any) => error.message || "Analysis failed",
    onSuccess: (data) => {
      setAcousticResults(data);
    },
  });

  const uniqueEquipmentTypes = Array.from(new Set(equipment.map(e => e.type).filter(Boolean)));

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">ML Training & Acoustic Monitoring</h1>
          <p className="text-muted-foreground mt-2">
            Train advanced machine learning models and analyze acoustic sensor data
          </p>
        </div>
      </div>

      <Tabs defaultValue="lstm" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="lstm" data-testid="tab-lstm">
            <Brain className="h-4 w-4 mr-2" />
            LSTM Training
          </TabsTrigger>
          <TabsTrigger value="rf" data-testid="tab-random-forest">
            <TrendingUp className="h-4 w-4 mr-2" />
            Random Forest
          </TabsTrigger>
          <TabsTrigger value="acoustic" data-testid="tab-acoustic">
            <Radio className="h-4 w-4 mr-2" />
            Acoustic Analysis
          </TabsTrigger>
          <TabsTrigger value="models" data-testid="tab-models">
            <Database className="h-4 w-4 mr-2" />
            Trained Models
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lstm" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                LSTM Neural Network Training
              </CardTitle>
              <CardDescription>
                Train a Long Short-Term Memory network for time-series failure prediction
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800" data-testid="alert-adaptive-window">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-900 dark:text-blue-100">
                  <strong>Smart Adaptive Training:</strong> The system automatically uses optimal training data range based on available history.
                  <div className="mt-2 text-sm space-y-1">
                    <div>🥉 <strong>Bronze (90-180 days):</strong> Basic predictions</div>
                    <div>🥈 <strong>Silver (180-365 days):</strong> Good confidence</div>
                    <div>🥇 <strong>Gold (365-730 days):</strong> High confidence</div>
                    <div>💎 <strong>Platinum (730+ days):</strong> Exceptional confidence</div>
                  </div>
                </AlertDescription>
              </Alert>
              
              <Alert data-testid="alert-lstm-info">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  LSTM models learn patterns from historical telemetry data to predict equipment failures.
                  Requires at least 10 time-series samples with sequential sensor readings.
                </AlertDescription>
              </Alert>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="lstm-equipment-type">Equipment Type (Optional)</Label>
                  <Select value={selectedEquipmentType} onValueChange={setSelectedEquipmentType}>
                    <SelectTrigger id="lstm-equipment-type" data-testid="select-lstm-equipment">
                      <SelectValue placeholder="All Equipment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" data-testid="option-all-equipment">All Equipment</SelectItem>
                      {uniqueEquipmentTypes.map(type => (
                        <SelectItem key={type} value={type} data-testid={`option-${type}`}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lstm-epochs">Training Epochs</Label>
                  <Input
                    id="lstm-epochs"
                    type="number"
                    defaultValue="50"
                    min="10"
                    max="200"
                    data-testid="input-lstm-epochs"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lstm-sequence">Sequence Length</Label>
                  <Input
                    id="lstm-sequence"
                    type="number"
                    defaultValue="10"
                    min="5"
                    max="50"
                    data-testid="input-lstm-sequence"
                  />
                </div>
              </div>

              <Button
                onClick={() => {
                  const epochs = parseInt((document.getElementById('lstm-epochs') as HTMLInputElement)?.value || "50");
                  const sequenceLength = parseInt((document.getElementById('lstm-sequence') as HTMLInputElement)?.value || "10");
                  trainLSTM.mutate({ equipmentType: selectedEquipmentType || undefined, epochs, sequenceLength });
                }}
                disabled={trainLSTM.isPending}
                className="w-full"
                data-testid="button-train-lstm"
              >
                {trainLSTM.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Training LSTM Model...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Train LSTM Model
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rf" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Random Forest Classifier Training
              </CardTitle>
              <CardDescription>
                Train a Random Forest model for equipment health classification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800" data-testid="alert-adaptive-window-rf">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-900 dark:text-blue-100">
                  <strong>Smart Adaptive Training:</strong> Uses optimal data range automatically (90-730 days based on availability).
                  Data quality tier affects prediction confidence.
                </AlertDescription>
              </Alert>
              
              <Alert data-testid="alert-rf-info">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Random Forest models classify equipment health status based on aggregated sensor statistics.
                  Requires equipment with historical sensor data and maintenance records.
                </AlertDescription>
              </Alert>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="rf-equipment-type">Equipment Type (Optional)</Label>
                  <Select value={selectedEquipmentType} onValueChange={setSelectedEquipmentType}>
                    <SelectTrigger id="rf-equipment-type" data-testid="select-rf-equipment">
                      <SelectValue placeholder="All Equipment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" data-testid="option-rf-all">All Equipment</SelectItem>
                      {uniqueEquipmentTypes.map(type => (
                        <SelectItem key={type} value={type} data-testid={`option-rf-${type}`}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rf-trees">Number of Trees</Label>
                  <Input
                    id="rf-trees"
                    type="number"
                    defaultValue="50"
                    min="10"
                    max="200"
                    data-testid="input-rf-trees"
                  />
                </div>
              </div>

              <Button
                onClick={() => {
                  const numTrees = parseInt((document.getElementById('rf-trees') as HTMLInputElement)?.value || "50");
                  trainRandomForest.mutate({ equipmentType: selectedEquipmentType || undefined, numTrees });
                }}
                disabled={trainRandomForest.isPending}
                className="w-full"
                data-testid="button-train-rf"
              >
                {trainRandomForest.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Training Random Forest...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Train Random Forest Model
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="acoustic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Radio className="h-5 w-5" />
                Acoustic Monitoring Analysis
              </CardTitle>
              <CardDescription>
                Analyze acoustic waveforms for frequency signatures and anomaly detection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert data-testid="alert-acoustic-info">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Acoustic analysis uses FFT to extract frequency signatures and detect abnormal sound patterns
                  that may indicate bearing wear, cavitation, or mechanical issues.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="acoustic-data">Acoustic Waveform Data (comma-separated values)</Label>
                <Textarea
                  id="acoustic-data"
                  placeholder="0.1, 0.2, -0.1, 0.3, -0.2, 0.15, -0.05, 0.25..."
                  value={acousticData}
                  onChange={(e) => setAcousticData(e.target.value)}
                  rows={4}
                  data-testid="input-acoustic-data"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sample-rate">Sample Rate (Hz)</Label>
                  <Input
                    id="sample-rate"
                    type="number"
                    value={sampleRate}
                    onChange={(e) => setSampleRate(e.target.value)}
                    data-testid="input-sample-rate"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rpm">RPM (Optional)</Label>
                  <Input
                    id="rpm"
                    type="number"
                    value={rpm}
                    onChange={(e) => setRpm(e.target.value)}
                    placeholder="e.g., 1800"
                    data-testid="input-rpm"
                  />
                </div>
              </div>

              <Button
                onClick={() => analyzeAcoustic.mutate()}
                disabled={analyzeAcoustic.isPending || !acousticData}
                className="w-full"
                data-testid="button-analyze-acoustic"
              >
                {analyzeAcoustic.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Activity className="h-4 w-4 mr-2" />
                    Analyze Acoustic Data
                  </>
                )}
              </Button>

              {acousticResults && (
                <Card className="mt-4 bg-muted/50" data-testid="card-acoustic-results">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      Analysis Results
                      <Badge variant={
                        acousticResults.severity === 'critical' ? 'destructive' :
                        acousticResults.severity === 'warning' ? 'default' : 
                        'outline'
                      } data-testid="badge-severity">
                        {acousticResults.severity}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="text-sm font-medium mb-2">Health Score</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all" 
                            style={{ width: `${acousticResults.healthScore}%` }}
                            data-testid="progress-health-score"
                          />
                        </div>
                        <span className="text-sm font-medium" data-testid="text-health-score">
                          {acousticResults.healthScore.toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    {acousticResults.features && (
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">RMS Level:</span>
                          <span className="ml-2 font-medium" data-testid="text-rms">{acousticResults.features.rms?.toFixed(3)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Peak Amplitude:</span>
                          <span className="ml-2 font-medium" data-testid="text-peak">{acousticResults.features.peakAmplitude?.toFixed(3)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Dominant Frequency:</span>
                          <span className="ml-2 font-medium" data-testid="text-dominant-freq">{acousticResults.features.dominantFrequency?.toFixed(1)} Hz</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">SNR:</span>
                          <span className="ml-2 font-medium" data-testid="text-snr">{acousticResults.features.snr?.toFixed(1)} dB</span>
                        </div>
                      </div>
                    )}

                    {acousticResults.primaryIssues && acousticResults.primaryIssues.length > 0 && (
                      <div>
                        <div className="text-sm font-medium mb-2">Primary Issues</div>
                        <ul className="space-y-1">
                          {acousticResults.primaryIssues.map((issue: string, i: number) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2" data-testid={`text-issue-${i}`}>
                              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              {issue}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {acousticResults.recommendations && acousticResults.recommendations.length > 0 && (
                      <div>
                        <div className="text-sm font-medium mb-2">Recommendations</div>
                        <ul className="space-y-1">
                          {acousticResults.recommendations.map((rec: string, i: number) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2" data-testid={`text-rec-${i}`}>
                              <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Trained ML Models
              </CardTitle>
              <CardDescription>
                View and manage your trained machine learning models
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingModels ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : mlModels.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="text-no-models">
                  <Database className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No trained models yet</p>
                  <p className="text-sm mt-1">Train an LSTM or Random Forest model to get started</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Model Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Equipment</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead>Data Quality</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mlModels.map((model: MlModel) => {
                      const tier = model.hyperparameters?.dataQualityTier;
                      const getTierBadge = (tier: string) => {
                        switch (tier) {
                          case 'platinum':
                            return { label: '💎 Platinum', className: 'bg-purple-500 text-white hover:bg-purple-600' };
                          case 'gold':
                            return { label: '🥇 Gold', className: 'bg-yellow-500 text-white hover:bg-yellow-600' };
                          case 'silver':
                            return { label: '🥈 Silver', className: 'bg-gray-400 text-white hover:bg-gray-500' };
                          case 'bronze':
                            return { label: '🥉 Bronze', className: 'bg-orange-600 text-white hover:bg-orange-700' };
                          default:
                            return { label: 'Unknown', className: 'bg-muted text-muted-foreground' };
                        }
                      };
                      
                      return (
                        <TableRow key={model.id} data-testid={`row-model-${model.id}`}>
                          <TableCell className="font-medium">{model.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" data-testid={`badge-type-${model.id}`}>
                              {model.modelType === 'failure_prediction' ? 'LSTM' : 
                               model.modelType === 'health_classification' ? 'Random Forest' : 
                               model.modelType}
                            </Badge>
                          </TableCell>
                          <TableCell>{model.targetEquipmentType || 'All'}</TableCell>
                          <TableCell>
                            {model.performance?.accuracy ? (
                              <span className="text-sm" data-testid={`text-accuracy-${model.id}`}>
                                {(model.performance.accuracy * 100).toFixed(1)}% accuracy
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-sm">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {tier ? (
                              <div className="space-y-1">
                                <Badge 
                                  className={getTierBadge(tier).className}
                                  data-testid={`badge-tier-${model.id}`}
                                >
                                  {getTierBadge(tier).label}
                                </Badge>
                                {model.hyperparameters?.lookbackDays && (
                                  <div className="text-xs text-muted-foreground">
                                    {model.hyperparameters.lookbackDays} days
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">Legacy</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {model.status === 'active' ? (
                              <Badge variant="default" className="bg-green-600" data-testid={`badge-status-${model.id}`}>
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary" data-testid={`badge-status-${model.id}`}>
                                {model.status}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(model.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ML/PDM Data Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export ML/PDM Data
          </CardTitle>
          <CardDescription>
            Export machine learning models, predictions, and telemetry data in industry-standard formats for use in competing applications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-900 dark:text-blue-100">
              <strong>Data Portability:</strong> Export your ML/PDM data to migrate to IBM Maximo, Azure IoT, SAP PM, or any competing predictive maintenance platform.
              All exports include tier metadata and are compatible with industry-standard tools.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Complete ML/PDM Export */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Complete ML/PDM Package
                </CardTitle>
                <CardDescription className="text-xs">
                  JSON: All datasets. CSV: ML models only
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex gap-2">
                  <Button 
                    variant="default" 
                    className="flex-1"
                    onClick={() => {
                      window.open(`/api/analytics/export/ml-pdm-complete?orgId=${orgId}&format=json`, '_blank');
                      toast({ title: "Downloading complete export", description: "All ML/PDM data in JSON format" });
                    }}
                    data-testid="button-export-complete-json"
                  >
                    <FileJson className="h-4 w-4 mr-2" />
                    JSON (All)
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      window.open(`/api/analytics/export/ml-pdm-complete?orgId=${orgId}&format=csv`, '_blank');
                      toast({ title: "Downloading models CSV", description: "ML models with tier metadata" });
                    }}
                    data-testid="button-export-complete-csv"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    CSV (Models)
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* ML Models Export */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  ML Models Only
                </CardTitle>
                <CardDescription className="text-xs">
                  Trained models with tier metadata and performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex gap-2">
                  <Button 
                    variant="default" 
                    className="flex-1"
                    onClick={() => {
                      window.open(`/api/analytics/export/ml-models?orgId=${orgId}&format=json`, '_blank');
                      toast({ title: "Downloading ML models", description: "JSON format with tier metadata" });
                    }}
                    data-testid="button-export-models-json"
                  >
                    <FileJson className="h-4 w-4 mr-2" />
                    JSON
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      window.open(`/api/analytics/export/ml-models?orgId=${orgId}&format=csv`, '_blank');
                      toast({ title: "Downloading ML models", description: "CSV format" });
                    }}
                    data-testid="button-export-models-csv"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Predictions Export */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Predictions & History
                </CardTitle>
                <CardDescription className="text-xs">
                  Failure predictions, RUL estimates, and historical failures
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex gap-2">
                  <Button 
                    variant="default" 
                    className="flex-1"
                    onClick={() => {
                      window.open(`/api/analytics/export/predictions?orgId=${orgId}&format=json`, '_blank');
                      toast({ title: "Downloading predictions", description: "Failure predictions and history" });
                    }}
                    data-testid="button-export-predictions-json"
                  >
                    <FileJson className="h-4 w-4 mr-2" />
                    JSON
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      window.open(`/api/analytics/export/predictions?orgId=${orgId}&format=csv`, '_blank');
                      toast({ title: "Downloading predictions", description: "CSV format" });
                    }}
                    data-testid="button-export-predictions-csv"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Telemetry Export */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Telemetry Data
                </CardTitle>
                <CardDescription className="text-xs">
                  Historical sensor data for ML training (up to 50k records)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex gap-2">
                  <Button 
                    variant="default" 
                    className="flex-1"
                    onClick={() => {
                      window.open(`/api/analytics/export/telemetry?orgId=${orgId}&format=json&limit=10000`, '_blank');
                      toast({ title: "Downloading telemetry", description: "Historical sensor data" });
                    }}
                    data-testid="button-export-telemetry-json"
                  >
                    <FileJson className="h-4 w-4 mr-2" />
                    JSON
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      window.open(`/api/analytics/export/telemetry?orgId=${orgId}&format=csv&limit=10000`, '_blank');
                      toast({ title: "Downloading telemetry", description: "CSV format" });
                    }}
                    data-testid="button-export-telemetry-csv"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Export Formats:</strong> JSON format includes all datasets (models, predictions, anomalies, thresholds, failure history, PDM scores) - use for complete platform migration. 
              CSV format contains ML models only with full tier metadata - use for spreadsheet analysis in Excel, Pandas, or BI tools.
              All models include adaptive training window tier metadata (Bronze/Silver/Gold/Platinum) for quality assessment.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
