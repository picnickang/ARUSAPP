import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Brain, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Activity,
  Waveform,
  Play,
  Database,
  Info,
  FileJson
} from "lucide-react";

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

  const trainLSTM = useMutation({
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
      
      return await apiRequest("/api/ml/train/lstm", {
        method: "POST",
        body: JSON.stringify(config),
        headers: { "Content-Type": "application/json" }
      });
    },
    onSuccess: (data) => {
      toast({
        title: "LSTM Training Complete",
        description: `Model trained successfully with ${(data.metrics.accuracy * 100).toFixed(1)}% accuracy`
      });
      refetchModels();
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/ml-models"] });
    },
    onError: (error: any) => {
      const message = error.message || "Training failed";
      toast({
        title: "LSTM Training Failed",
        description: message,
        variant: "destructive"
      });
    }
  });

  const trainRandomForest = useMutation({
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
      
      return await apiRequest("/api/ml/train/random-forest", {
        method: "POST",
        body: JSON.stringify(config),
        headers: { "Content-Type": "application/json" }
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Random Forest Training Complete",
        description: `Model trained successfully with ${(data.metrics.accuracy * 100).toFixed(1)}% accuracy`
      });
      refetchModels();
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/ml-models"] });
    },
    onError: (error: any) => {
      const message = error.message || "Training failed";
      toast({
        title: "Random Forest Training Failed",
        description: message,
        variant: "destructive"
      });
    }
  });

  const [acousticData, setAcousticData] = useState("");
  const [sampleRate, setSampleRate] = useState("44100");
  const [rpm, setRpm] = useState("");
  const [acousticResults, setAcousticResults] = useState<any>(null);

  const analyzeAcoustic = useMutation({
    mutationFn: async () => {
      const data = acousticData.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
      
      if (data.length === 0) {
        throw new Error("Invalid acoustic data. Please provide comma-separated numbers.");
      }
      
      return await apiRequest("/api/acoustic/analyze", {
        method: "POST",
        body: JSON.stringify({
          acousticData: data,
          sampleRate: parseInt(sampleRate),
          rpm: rpm ? parseFloat(rpm) : undefined
        }),
        headers: { "Content-Type": "application/json" }
      });
    },
    onSuccess: (data) => {
      setAcousticResults(data);
      toast({
        title: "Acoustic Analysis Complete",
        description: `Health score: ${data.healthScore?.toFixed(0)}% - ${data.severity} severity`
      });
    },
    onError: (error: any) => {
      toast({
        title: "Acoustic Analysis Failed",
        description: error.message || "Analysis failed",
        variant: "destructive"
      });
    }
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
            <Waveform className="h-4 w-4 mr-2" />
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
                      <SelectItem value="" data-testid="option-all-equipment">All Equipment</SelectItem>
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
                      <SelectItem value="" data-testid="option-rf-all">All Equipment</SelectItem>
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
                <Waveform className="h-5 w-5" />
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
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mlModels.map((model: MlModel) => (
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
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
