import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, Activity, TrendingUp, AlertOctagon, Calendar, GitBranch } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface ValidationTest {
  name: string;
  status: 'passed' | 'failed' | 'warning';
  details: any;
  timestamp: string;
}

interface ValidationResults {
  timestamp: string;
  orgId: string;
  tests: ValidationTest[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

export default function EnhancedTrendsValidation() {
  const { toast } = useToast();
  const { data: validationResults, isLoading, error, isError, refetch, isFetching } = useQuery<ValidationResults>({
    queryKey: ['/api/analytics/enhanced-trends-validation'],
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const handleRunTests = () => {
    toast({
      title: "Running validation tests...",
      description: "Testing enhanced trend analytics",
    });
    refetch();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" data-testid="icon-status-passed" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" data-testid="icon-status-failed" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" data-testid="icon-status-warning" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'passed' ? 'default' : status === 'failed' ? 'destructive' : 'secondary';
    return (
      <Badge variant={variant} data-testid={`badge-status-${status}`}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getTestIcon = (testName: string) => {
    if (testName.includes('Statistical')) return <Activity className="h-5 w-5" />;
    if (testName.includes('Anomaly')) return <AlertOctagon className="h-5 w-5" />;
    if (testName.includes('Forecasting')) return <TrendingUp className="h-5 w-5" />;
    if (testName.includes('Seasonality')) return <Calendar className="h-5 w-5" />;
    if (testName.includes('Correlation')) return <GitBranch className="h-5 w-5" />;
    return <Activity className="h-5 w-5" />;
  };

  if (isLoading || isFetching) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-48 w-full" />
        <div className="text-center text-sm text-muted-foreground">
          Running validation tests...
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-validation">
              Enhanced Trends Validation
            </h1>
            <p className="text-muted-foreground mt-2">
              Comprehensive validation of enhanced trend analytics
            </p>
          </div>
          <Button onClick={handleRunTests} data-testid="button-retry" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Validation Failed
            </CardTitle>
            <CardDescription>
              An error occurred while running the validation tests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-sm font-mono text-destructive">
                {error instanceof Error ? error.message : 'Unknown error occurred'}
              </p>
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              <p className="font-medium mb-2">Possible causes:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Insufficient telemetry data in the database</li>
                <li>Network connectivity issues</li>
                <li>Server configuration problems</li>
              </ul>
              <p className="mt-3">
                Try clicking the Retry button or check the server logs for more details.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!validationResults) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-validation">
              Enhanced Trends Validation
            </h1>
            <p className="text-muted-foreground mt-2">
              Comprehensive validation of enhanced trend analytics
            </p>
          </div>
          <Button onClick={handleRunTests} data-testid="button-run-tests" variant="default">
            <RefreshCw className="h-4 w-4 mr-2" />
            Run Tests
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>No Test Results</CardTitle>
            <CardDescription>
              Click "Run Tests" to start validation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This tool will validate the enhanced trend analytics system by running comprehensive tests on:
            </p>
            <ul className="list-disc pl-5 mt-3 space-y-2 text-sm text-muted-foreground">
              <li>Statistical summary calculations (mean, std dev, quartiles, trend analysis)</li>
              <li>Anomaly detection using hybrid methods (IQR, Z-score, isolation)</li>
              <li>Time-series forecasting with multiple models</li>
              <li>Seasonality pattern detection</li>
              <li>Cross-sensor correlation analysis</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-validation">
            Enhanced Trends Validation
          </h1>
          <p className="text-muted-foreground mt-2" data-testid="text-description">
            Comprehensive validation of enhanced trend analytics to ensure statistical accuracy and reliability
          </p>
        </div>
        <Button onClick={handleRunTests} data-testid="button-refresh" variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Run Tests
        </Button>
      </div>

      {validationResults && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Test Summary</CardTitle>
              <CardDescription>
                Last run: {new Date(validationResults.timestamp).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center" data-testid="summary-total">
                  <div className="text-3xl font-bold">{validationResults.summary.total}</div>
                  <div className="text-sm text-muted-foreground">Total Tests</div>
                </div>
                <div className="text-center" data-testid="summary-passed">
                  <div className="text-3xl font-bold text-green-600">{validationResults.summary.passed}</div>
                  <div className="text-sm text-muted-foreground">Passed</div>
                </div>
                <div className="text-center" data-testid="summary-failed">
                  <div className="text-3xl font-bold text-red-600">{validationResults.summary.failed}</div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </div>
                <div className="text-center" data-testid="summary-warnings">
                  <div className="text-3xl font-bold text-yellow-600">{validationResults.summary.warnings}</div>
                  <div className="text-sm text-muted-foreground">Warnings</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all" data-testid="tab-all">All Tests</TabsTrigger>
              <TabsTrigger value="passed" data-testid="tab-passed">Passed</TabsTrigger>
              <TabsTrigger value="failed" data-testid="tab-failed">Failed</TabsTrigger>
              <TabsTrigger value="warnings" data-testid="tab-warnings">Warnings</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {validationResults.tests.map((test, index) => (
                <Card key={index} data-testid={`test-card-${index}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getTestIcon(test.name)}
                        <CardTitle className="text-lg">{test.name}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(test.status)}
                        {getStatusBadge(test.status)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {test.details.error && (
                        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4" data-testid={`error-${index}`}>
                          <p className="font-medium text-red-900 dark:text-red-100">Error</p>
                          <p className="text-sm text-red-700 dark:text-red-300 mt-1">{test.details.error}</p>
                        </div>
                      )}

                      {test.details.message && (
                        <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4" data-testid={`message-${index}`}>
                          <p className="font-medium text-yellow-900 dark:text-yellow-100">Message</p>
                          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">{test.details.message}</p>
                        </div>
                      )}

                      {test.details.recommendation && (
                        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4" data-testid={`recommendation-${index}`}>
                          <p className="font-medium text-blue-900 dark:text-blue-100">Recommendation</p>
                          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">{test.details.recommendation}</p>
                        </div>
                      )}

                      {test.details.equipmentId && (
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Equipment ID:</span>
                            <span className="ml-2 font-mono text-muted-foreground">{test.details.equipmentId}</span>
                          </div>
                          {test.details.sensorType && (
                            <div>
                              <span className="font-medium">Sensor Type:</span>
                              <span className="ml-2">{test.details.sensorType}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {test.details.checks && (
                        <div className="border rounded-lg p-4">
                          <p className="font-medium mb-3">Validation Checks</p>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(test.details.checks).map(([key, value]) => (
                              <div key={key} className="flex items-center gap-2" data-testid={`check-${index}-${key}`}>
                                {value ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-600" />
                                )}
                                <span className="text-sm">{key}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {test.details.dataPoints && (
                        <div className="border rounded-lg p-4">
                          <p className="font-medium mb-3">Statistical Results</p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                            {test.details.dataPoints && (
                              <div>
                                <span className="text-muted-foreground">Data Points:</span>
                                <span className="ml-2 font-medium">{test.details.dataPoints}</span>
                              </div>
                            )}
                            {test.details.mean && (
                              <div>
                                <span className="text-muted-foreground">Mean:</span>
                                <span className="ml-2 font-medium">{test.details.mean}</span>
                              </div>
                            )}
                            {test.details.stdDev && (
                              <div>
                                <span className="text-muted-foreground">Std Dev:</span>
                                <span className="ml-2 font-medium">{test.details.stdDev}</span>
                              </div>
                            )}
                            {test.details.trendType && (
                              <div>
                                <span className="text-muted-foreground">Trend:</span>
                                <span className="ml-2 font-medium">{test.details.trendType}</span>
                              </div>
                            )}
                            {test.details.rSquared && (
                              <div>
                                <span className="text-muted-foreground">R²:</span>
                                <span className="ml-2 font-medium">{test.details.rSquared}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {test.details.method && (
                        <div className="border rounded-lg p-4">
                          <p className="font-medium mb-3">Analysis Details</p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                            {test.details.method && (
                              <div>
                                <span className="text-muted-foreground">Method:</span>
                                <span className="ml-2 font-medium">{test.details.method}</span>
                              </div>
                            )}
                            {test.details.totalAnomalies !== undefined && (
                              <div>
                                <span className="text-muted-foreground">Anomalies:</span>
                                <span className="ml-2 font-medium">{test.details.totalAnomalies}</span>
                              </div>
                            )}
                            {test.details.anomalyRate && (
                              <div>
                                <span className="text-muted-foreground">Rate:</span>
                                <span className="ml-2 font-medium">{test.details.anomalyRate}</span>
                              </div>
                            )}
                            {test.details.severity && (
                              <div>
                                <span className="text-muted-foreground">Severity:</span>
                                <Badge variant="outline" className="ml-2">{test.details.severity}</Badge>
                              </div>
                            )}
                            {test.details.predictionCount !== undefined && (
                              <div>
                                <span className="text-muted-foreground">Predictions:</span>
                                <span className="ml-2 font-medium">{test.details.predictionCount}</span>
                              </div>
                            )}
                            {test.details.confidence && (
                              <div>
                                <span className="text-muted-foreground">Confidence:</span>
                                <span className="ml-2 font-medium">{test.details.confidence}</span>
                              </div>
                            )}
                            {test.details.hasSeasonality !== undefined && (
                              <div>
                                <span className="text-muted-foreground">Seasonality:</span>
                                <span className="ml-2 font-medium">{test.details.hasSeasonality ? 'Yes' : 'No'}</span>
                              </div>
                            )}
                            {test.details.cyclesDetected !== undefined && (
                              <div>
                                <span className="text-muted-foreground">Cycles:</span>
                                <span className="ml-2 font-medium">{test.details.cyclesDetected}</span>
                              </div>
                            )}
                            {test.details.correlationsFound !== undefined && (
                              <div>
                                <span className="text-muted-foreground">Correlations:</span>
                                <span className="ml-2 font-medium">{test.details.correlationsFound}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {test.details.metrics && (
                        <div className="border rounded-lg p-4">
                          <p className="font-medium mb-3">Forecast Metrics</p>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">MAE:</span>
                              <span className="ml-2 font-medium">{test.details.metrics.mae}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">RMSE:</span>
                              <span className="ml-2 font-medium">{test.details.metrics.rmse}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">MAPE:</span>
                              <span className="ml-2 font-medium">{test.details.metrics.mape}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {test.details.cycles && test.details.cycles.length > 0 && (
                        <div className="border rounded-lg p-4">
                          <p className="font-medium mb-3">Detected Cycles</p>
                          <div className="space-y-2">
                            {test.details.cycles.map((cycle: any, cycleIndex: number) => (
                              <div key={cycleIndex} className="flex items-center justify-between text-sm bg-muted p-2 rounded">
                                <span>{cycle.type}</span>
                                <div className="flex gap-4">
                                  <span className="text-muted-foreground">Period: {cycle.period}</span>
                                  <span className="text-muted-foreground">Strength: {cycle.strength}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {test.details.topCorrelations && test.details.topCorrelations.length > 0 && (
                        <div className="border rounded-lg p-4">
                          <p className="font-medium mb-3">Top Correlations</p>
                          <div className="space-y-2">
                            {test.details.topCorrelations.map((corr: any, corrIndex: number) => (
                              <div key={corrIndex} className="flex items-center justify-between text-sm bg-muted p-2 rounded" data-testid={`correlation-${index}-${corrIndex}`}>
                                <span className="font-medium">{corr.sensor}</span>
                                <div className="flex gap-4">
                                  <span className="text-muted-foreground">r: {corr.correlation}</span>
                                  <Badge variant="outline">{corr.strength}</Badge>
                                  <Badge variant="secondary">{corr.relationship}</Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="passed" className="space-y-4">
              {validationResults.tests.filter(t => t.status === 'passed').map((test, index) => (
                <Card key={index} data-testid={`passed-card-${index}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getTestIcon(test.name)}
                        <CardTitle className="text-lg">{test.name}</CardTitle>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Test passed successfully</p>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="failed" className="space-y-4">
              {validationResults.tests.filter(t => t.status === 'failed').map((test, index) => (
                <Card key={index} data-testid={`failed-card-${index}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getTestIcon(test.name)}
                        <CardTitle className="text-lg">{test.name}</CardTitle>
                      </div>
                      <XCircle className="h-5 w-5 text-red-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {test.details.error && (
                      <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <p className="text-sm text-red-700 dark:text-red-300">{test.details.error}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="warnings" className="space-y-4">
              {validationResults.tests.filter(t => t.status === 'warning').map((test, index) => (
                <Card key={index} data-testid={`warning-card-${index}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getTestIcon(test.name)}
                        <CardTitle className="text-lg">{test.name}</CardTitle>
                      </div>
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {test.details.message && (
                      <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-3">
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">{test.details.message}</p>
                      </div>
                    )}
                    {test.details.recommendation && (
                      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <p className="text-sm text-blue-700 dark:text-blue-300">{test.details.recommendation}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
