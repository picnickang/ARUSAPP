import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Activity, Target, TrendingUp, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ModelPerformanceSummary {
  modelId: string;
  modelName: string;
  modelType: string;
  totalPredictions: number;
  validatedPredictions: number;
  avgAccuracy: number;
  avgTimeToFailureError: number;
  lastValidation: Date | null;
}

interface ModelPerformanceValidation {
  validation: {
    id: number;
    modelId: string;
    equipmentId: string;
    predictionType: string;
    predictionTimestamp: Date;
    predictedOutcome: any;
    actualOutcome: any;
    validatedAt: Date | null;
    accuracyScore: number | null;
    timeToFailureError: number | null;
    classificationLabel: string | null;
  };
  modelName: string | null;
  equipmentName: string | null;
}

export default function ModelPerformancePage() {
  const { data: summary, isLoading: summaryLoading } = useQuery<ModelPerformanceSummary[]>({
    queryKey: ["/api/analytics/model-performance/summary"],
  });

  const { data: validations, isLoading: validationsLoading } = useQuery<ModelPerformanceValidation[]>({
    queryKey: ["/api/analytics/model-performance"],
  });

  // Calculate overall metrics
  const overallMetrics = summary?.reduce(
    (acc, model) => ({
      totalModels: acc.totalModels + 1,
      totalPredictions: acc.totalPredictions + model.totalPredictions,
      totalValidated: acc.totalValidated + model.validatedPredictions,
      avgAccuracy: acc.avgAccuracy + (model.avgAccuracy || 0),
    }),
    { totalModels: 0, totalPredictions: 0, totalValidated: 0, avgAccuracy: 0 }
  );

  const overallAvgAccuracy = overallMetrics && overallMetrics.totalModels > 0
    ? (overallMetrics.avgAccuracy / overallMetrics.totalModels) * 100
    : 0;

  const validationRate = overallMetrics && overallMetrics.totalPredictions > 0
    ? (overallMetrics.totalValidated / overallMetrics.totalPredictions) * 100
    : 0;

  const getAccuracyBadge = (accuracy: number | null) => {
    if (accuracy === null) return <Badge variant="secondary" data-testid={`badge-pending`}>Pending</Badge>;
    const percent = accuracy * 100;
    if (percent >= 90) return <Badge className="bg-green-500" data-testid={`badge-excellent`}>Excellent ({percent.toFixed(1)}%)</Badge>;
    if (percent >= 80) return <Badge className="bg-blue-500" data-testid={`badge-good`}>Good ({percent.toFixed(1)}%)</Badge>;
    if (percent >= 70) return <Badge className="bg-yellow-500" data-testid={`badge-fair`}>Fair ({percent.toFixed(1)}%)</Badge>;
    return <Badge variant="destructive" data-testid={`badge-poor`}>Poor ({percent.toFixed(1)}%)</Badge>;
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-model-performance">Model Performance Dashboard</h1>
          <p className="text-muted-foreground" data-testid="text-description">
            Track prediction accuracy and model effectiveness over time
          </p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        <Card className="flex-1 min-w-[200px] p-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Active Models</p>
              {summaryLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <p className="text-2xl font-bold" data-testid="stat-active-models">
                  {overallMetrics?.totalModels || 0}
                </p>
              )}
            </div>
          </div>
        </Card>

        <Card className="flex-1 min-w-[200px] p-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-500" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Total Predictions</p>
              {summaryLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <p className="text-2xl font-bold" data-testid="stat-total-predictions">
                  {overallMetrics?.totalPredictions || 0}
                </p>
              )}
            </div>
          </div>
        </Card>

        <Card className="flex-1 min-w-[200px] p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Validated</p>
              {summaryLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <p className="text-2xl font-bold" data-testid="stat-validated">
                  {overallMetrics?.totalValidated || 0} 
                  <span className="text-sm text-muted-foreground ml-1">
                    ({validationRate.toFixed(0)}%)
                  </span>
                </p>
              )}
            </div>
          </div>
        </Card>

        <Card className="flex-1 min-w-[200px] p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Avg Accuracy</p>
              {summaryLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <p className="text-2xl font-bold" data-testid="stat-avg-accuracy">
                  {overallAvgAccuracy.toFixed(1)}%
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Model Performance Summary Table */}
      <Card>
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold" data-testid="heading-model-summary">Model Performance Summary</h2>
          <p className="text-sm text-muted-foreground">Accuracy metrics by model</p>
        </div>
        <div className="overflow-x-auto">
          {summaryLoading ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : summary && summary.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead data-testid="header-model">Model</TableHead>
                  <TableHead data-testid="header-type">Type</TableHead>
                  <TableHead className="text-right" data-testid="header-predictions">Predictions</TableHead>
                  <TableHead className="text-right" data-testid="header-validated">Validated</TableHead>
                  <TableHead className="text-right" data-testid="header-accuracy">Avg Accuracy</TableHead>
                  <TableHead className="text-right" data-testid="header-ttf-error">Avg TTF Error (days)</TableHead>
                  <TableHead data-testid="header-last-validation">Last Validation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.map((model, index) => (
                  <TableRow key={model.modelId} data-testid={`row-model-${index}`}>
                    <TableCell className="font-medium" data-testid={`cell-model-name-${index}`}>
                      {model.modelName || model.modelId}
                    </TableCell>
                    <TableCell data-testid={`cell-model-type-${index}`}>
                      <Badge variant="outline">{model.modelType}</Badge>
                    </TableCell>
                    <TableCell className="text-right" data-testid={`cell-predictions-${index}`}>
                      {model.totalPredictions}
                    </TableCell>
                    <TableCell className="text-right" data-testid={`cell-validated-${index}`}>
                      {model.validatedPredictions}
                      <span className="text-sm text-muted-foreground ml-1">
                        ({model.totalPredictions > 0 
                          ? ((model.validatedPredictions / model.totalPredictions) * 100).toFixed(0) 
                          : 0}%)
                      </span>
                    </TableCell>
                    <TableCell className="text-right" data-testid={`cell-accuracy-${index}`}>
                      {getAccuracyBadge(model.avgAccuracy)}
                    </TableCell>
                    <TableCell className="text-right" data-testid={`cell-ttf-error-${index}`}>
                      {model.avgTimeToFailureError 
                        ? `±${Math.abs(model.avgTimeToFailureError).toFixed(1)}`
                        : "—"}
                    </TableCell>
                    <TableCell data-testid={`cell-last-validation-${index}`}>
                      {model.lastValidation ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(model.lastValidation), { addSuffix: true })}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center text-muted-foreground" data-testid="text-no-models">
              <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No model performance data available yet</p>
              <p className="text-sm">Performance metrics will appear as predictions are validated</p>
            </div>
          )}
        </div>
      </Card>

      {/* Recent Validations */}
      <Card>
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold" data-testid="heading-recent-validations">Recent Validations</h2>
          <p className="text-sm text-muted-foreground">Latest prediction validation results</p>
        </div>
        <div className="overflow-x-auto">
          {validationsLoading ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : validations && validations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead data-testid="header-val-equipment">Equipment</TableHead>
                  <TableHead data-testid="header-val-model">Model</TableHead>
                  <TableHead data-testid="header-val-type">Type</TableHead>
                  <TableHead data-testid="header-val-predicted">Predicted</TableHead>
                  <TableHead data-testid="header-val-accuracy">Accuracy</TableHead>
                  <TableHead data-testid="header-val-status">Status</TableHead>
                  <TableHead data-testid="header-val-date">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {validations.slice(0, 20).map((item, index) => (
                  <TableRow key={item.validation.id} data-testid={`row-validation-${index}`}>
                    <TableCell className="font-medium" data-testid={`cell-val-equipment-${index}`}>
                      {item.equipmentName || item.validation.equipmentId}
                    </TableCell>
                    <TableCell data-testid={`cell-val-model-${index}`}>
                      <span className="text-sm">{item.modelName || 'Unknown'}</span>
                    </TableCell>
                    <TableCell data-testid={`cell-val-type-${index}`}>
                      <Badge variant="outline">{item.validation.predictionType}</Badge>
                    </TableCell>
                    <TableCell data-testid={`cell-val-predicted-${index}`}>
                      <span className="text-sm text-muted-foreground">
                        {item.validation.classificationLabel || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell data-testid={`cell-val-accuracy-result-${index}`}>
                      {getAccuracyBadge(item.validation.accuracyScore)}
                    </TableCell>
                    <TableCell data-testid={`cell-val-status-${index}`}>
                      {item.validation.validatedAt ? (
                        <Badge className="bg-green-500">Validated</Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell data-testid={`cell-val-date-${index}`}>
                      <span className="text-sm">
                        {formatDistanceToNow(new Date(item.validation.predictionTimestamp), { addSuffix: true })}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center text-muted-foreground" data-testid="text-no-validations">
              <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No validation records available yet</p>
              <p className="text-sm">Validations will appear as predictions are verified against actual outcomes</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
