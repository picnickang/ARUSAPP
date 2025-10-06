import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, Ship, TrendingUp, Users, Target, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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

export default function FleetPerformanceValidation() {
  const { data: validationResults, isLoading, error, isError, refetch, isFetching } = useQuery<ValidationResults>({
    queryKey: ['/api/analytics/fleet-performance-validation'],
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

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
    if (testName.includes('Fleet Health')) return <Ship className="h-5 w-5" />;
    if (testName.includes('Distribution')) return <BarChart3 className="h-5 w-5" />;
    if (testName.includes('Benchmarks')) return <TrendingUp className="h-5 w-5" />;
    if (testName.includes('Performers')) return <Target className="h-5 w-5" />;
    if (testName.includes('Overview') || testName.includes('Comparison')) return <Users className="h-5 w-5" />;
    return <Ship className="h-5 w-5" />;
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
          Running validation tests with mock data...
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
              Fleet Performance Validation
            </h1>
            <p className="text-muted-foreground mt-2">
              Comprehensive validation of fleet performance metrics using mock data
            </p>
          </div>
          <Button onClick={() => refetch()} data-testid="button-retry" variant="outline">
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
                <li>Server configuration problems</li>
                <li>Network connectivity issues</li>
                <li>Backend service unavailable</li>
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
              Fleet Performance Validation
            </h1>
            <p className="text-muted-foreground mt-2">
              Comprehensive validation of fleet performance metrics using mock data
            </p>
          </div>
          <Button onClick={() => refetch()} data-testid="button-run-tests" variant="default">
            <RefreshCw className="h-4 w-4 mr-2" />
            Run Tests
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>No Test Results</CardTitle>
            <CardDescription>
              Click "Run Tests" to start validation with mock data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This tool will validate fleet performance metrics calculations using synthetic test data:
            </p>
            <ul className="list-disc pl-5 mt-3 space-y-2 text-sm text-muted-foreground">
              <li>Fleet health score calculation (averaging across equipment)</li>
              <li>Equipment health distribution (healthy/warning/critical classification)</li>
              <li>Fleet benchmarks (averages, medians, percentiles)</li>
              <li>Best and worst performer identification</li>
              <li>Vessel fleet overview aggregation</li>
              <li>Cross-equipment comparison and ranking</li>
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
            Fleet Performance Validation
          </h1>
          <p className="text-muted-foreground mt-2" data-testid="text-description">
            Comprehensive validation of fleet performance metrics using mock data to verify calculation accuracy
          </p>
        </div>
        <Button onClick={() => refetch()} data-testid="button-refresh" variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Run Tests
        </Button>
      </div>

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

                    {test.details.mockDataPoints && (
                      <div className="border rounded-lg p-4">
                        <p className="font-medium mb-3">Mock Data Used</p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Data Points:</span>
                            <span className="ml-2 font-medium">{test.details.mockDataPoints}</span>
                          </div>
                          {test.details.formula && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Formula:</span>
                              <span className="ml-2 font-medium">{test.details.formula}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {(test.details.expectedValue || test.details.expected) && (
                      <div className="border rounded-lg p-4">
                        <p className="font-medium mb-3">Test Results</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          {test.details.expectedValue && (
                            <>
                              <div>
                                <span className="text-muted-foreground">Expected:</span>
                                <span className="ml-2 font-medium">{test.details.expectedValue}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Calculated:</span>
                                <span className="ml-2 font-medium">{test.details.calculatedValue}</span>
                              </div>
                              {test.details.accuracy && (
                                <div>
                                  <span className="text-muted-foreground">Accuracy:</span>
                                  <span className="ml-2 font-medium text-green-600">{test.details.accuracy}</span>
                                </div>
                              )}
                            </>
                          )}
                          {test.details.expected && !test.details.expectedValue && (
                            <div className="col-span-full">
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <span className="text-muted-foreground block">Expected</span>
                                  <pre className="text-xs mt-1">{JSON.stringify(test.details.expected, null, 2)}</pre>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block">Calculated</span>
                                  <pre className="text-xs mt-1">{JSON.stringify(test.details.calculated, null, 2)}</pre>
                                </div>
                                {test.details.thresholds && (
                                  <div>
                                    <span className="text-muted-foreground block">Thresholds</span>
                                    <pre className="text-xs mt-1">{JSON.stringify(test.details.thresholds, null, 2)}</pre>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {test.details.benchmarks && (
                      <div className="border rounded-lg p-4">
                        <p className="font-medium mb-3">Benchmarks Analysis</p>
                        <div className="space-y-2 text-sm">
                          {Object.entries(test.details.benchmarks).map(([key, value]: [string, any]) => (
                            <div key={key} className="flex items-center justify-between bg-muted p-2 rounded">
                              <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                              <div className="flex gap-4">
                                <span>Expected: {value.expected}</span>
                                <span>Calculated: {value.calculated}</span>
                                <Badge variant={value.accurate ? 'default' : 'destructive'}>
                                  {value.accurate ? '✓' : '✗'}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                        {test.details.sortedData && (
                          <div className="mt-3 text-xs text-muted-foreground">
                            <span className="font-medium">Sorted Data:</span> {test.details.sortedData}
                          </div>
                        )}
                      </div>
                    )}

                    {(test.details.bestPerformers || test.details.worstPerformers) && (
                      <div className="grid grid-cols-2 gap-4">
                        {test.details.bestPerformers && (
                          <div className="border rounded-lg p-4">
                            <p className="font-medium mb-3 text-green-600">Best Performers</p>
                            <div className="space-y-2">
                              {test.details.bestPerformers.details.map((perf: any, i: number) => (
                                <div key={i} className="bg-green-50 dark:bg-green-950 p-2 rounded text-sm">
                                  <div className="font-medium">{perf.id}</div>
                                  <div className="text-xs text-muted-foreground">
                                    Health: {perf.healthIndex} | Days: {perf.daysToMaintenance} | {perf.vessel}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {test.details.worstPerformers && (
                          <div className="border rounded-lg p-4">
                            <p className="font-medium mb-3 text-red-600">Worst Performers</p>
                            <div className="space-y-2">
                              {test.details.worstPerformers.details.map((perf: any, i: number) => (
                                <div key={i} className="bg-red-50 dark:bg-red-950 p-2 rounded text-sm">
                                  <div className="font-medium">{perf.id}</div>
                                  <div className="text-xs text-muted-foreground">
                                    Health: {perf.healthIndex} | Days: {perf.daysToMaintenance} | Issues: {perf.issues}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {test.details.aggregations && (
                      <div className="border rounded-lg p-4">
                        <p className="font-medium mb-3">Aggregation Results</p>
                        <div className="grid grid-cols-2 gap-3">
                          {Object.entries(test.details.aggregations).map(([key, value]: [string, any]) => (
                            <div key={key} className="bg-muted p-3 rounded">
                              <div className="text-xs text-muted-foreground mb-1">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm">E: {value.expected}</span>
                                <span className="text-sm">C: {value.calculated}</span>
                                <Badge variant={value.correct ? 'default' : 'destructive'} className="text-xs">
                                  {value.correct ? '✓' : '✗'}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
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
                  <p className="text-sm text-muted-foreground">Test passed successfully with {test.details.accuracy || '100%'} accuracy</p>
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
                    <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">{test.details.message}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </>
    </div>
  );
}
