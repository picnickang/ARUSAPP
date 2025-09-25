import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatDateSgt } from "@/lib/time-utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Brain, FileText, BarChart3, Shield, AlertCircle, Download, Loader2, TrendingUp, TrendingDown, Target } from "lucide-react";

interface ReportResponse {
  metadata: {
    title: string;
    generatedAt: string;
    reportType: string;
    equipmentFilter?: string;
  };
  sections: {
    summary: any;
    [key: string]: any;
  };
}

export default function ReportsConsole() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastReport, setLastReport] = useState<ReportResponse | null>(null);

  async function generateReport(endpoint: string, params: any = {}, reportName: string) {
    setBusy(true);
    setError(null);
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result: ReportResponse = await response.json();
      setLastReport(result);
      
    } catch (error: any) {
      console.error(`${reportName} generation failed:`, error);
      setError(error.message || `Failed to generate ${reportName}`);
    } finally {
      setBusy(false);
    }
  }

  function downloadReport() {
    if (!lastReport) return;
    
    // Create simple text version for download
    const { metadata, sections } = lastReport;
    let content = `${metadata.title}\n\n`;
    content += `Generated: ${new Date(metadata.generatedAt).toLocaleString()}\n`;
    content += `Type: ${metadata.reportType}\n`;
    if (metadata.equipmentFilter && metadata.equipmentFilter !== 'all') {
      content += `Filter: ${metadata.equipmentFilter}\n`;
    }
    content += '\nSummary:\n';
    
    if (sections.summary) {
      Object.entries(sections.summary).forEach(([key, value]) => {
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        content += `- ${label}: ${value}\n`;
      });
    }
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${lastReport.metadata.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function exportReportAs(format: 'csv' | 'html') {
    if (!lastReport) return;

    try {
      setBusy(true);
      
      // Determine report type from metadata
      const reportType = lastReport.metadata.reportType || 'fleet';
      const title = lastReport.metadata.title || 'Marine Report';
      
      const endpoint = format === 'csv' ? '/api/reports/export/llm-csv' : '/api/reports/export/llm-html';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: reportType,
          title: title,
          equipmentId: lastReport.metadata.equipmentFilter !== 'all' ? lastReport.metadata.equipmentFilter : undefined
        }),
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      // Get the filename from Content-Disposition header or create default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `llm_report_${reportType}_${new Date().toISOString().split('T')[0]}.${format}`;
      
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }

      // Download the file
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Show success message
      if (format === 'csv') {
        setLastReport(prev => prev ? {
          ...prev,
          sections: {
            ...prev.sections,
            exportSuccess: { message: 'CSV export completed successfully', timestamp: new Date().toISOString() }
          }
        } : null);
      } else {
        setLastReport(prev => prev ? {
          ...prev,
          sections: {
            ...prev.sections,
            exportSuccess: { message: 'HTML export completed successfully', timestamp: new Date().toISOString() }
          }
        } : null);
      }

    } catch (error) {
      console.error(`${format.toUpperCase()} export error:`, error);
      setLastReport(prev => prev ? {
        ...prev,
        sections: {
          ...prev.sections,
          exportError: { message: `Failed to export ${format.toUpperCase()}: ${error}`, timestamp: new Date().toISOString() }
        }
      } : null);
    } finally {
      setBusy(false);
    }
  }

  const reportButtons = [
    {
      label: "Health Report",
      endpoint: "/api/report/health",
      params: { lookbackHours: 24 },
      icon: <BarChart3 className="h-4 w-4" />,
      description: "Equipment health analysis",
      color: "bg-green-500"
    },
    {
      label: "Maintenance Report", 
      endpoint: "/api/report/maintenance",
      params: { lookbackHours: 168 },
      icon: <FileText className="h-4 w-4" />,
      description: "Maintenance scheduling & compliance",
      color: "bg-blue-500"
    },
    {
      label: "Fleet Summary",
      endpoint: "/api/report/fleet-summary", 
      params: { lookbackHours: 168 },
      icon: <BarChart3 className="h-4 w-4" />,
      description: "High-level fleet overview",
      color: "bg-purple-500"
    },
    {
      label: "Maintenance Compliance",
      endpoint: "/api/report/compliance/maintenance",
      params: { period: 'QTD' },
      icon: <Shield className="h-4 w-4" />,
      description: "Regulatory compliance status",
      color: "bg-orange-500"
    },
    {
      label: "Alert Response Compliance",
      endpoint: "/api/report/compliance/alerts",
      params: { slaHours: 24, lookbackHours: 168 },
      icon: <AlertCircle className="h-4 w-4" />,
      description: "Alert handling effectiveness",
      color: "bg-red-500"
    }
  ];

  return (
    <Card className="w-full" data-testid="card-reports-console">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <CardTitle>LLM Reports Console</CardTitle>
          </div>
          {lastReport && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadReport}
                disabled={busy}
                data-testid="button-download-report"
              >
                <Download className="h-4 w-4 mr-2" />
                Download MD
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportReportAs('csv')}
                disabled={busy}
                data-testid="button-export-csv"
              >
                <FileText className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportReportAs('html')}
                disabled={busy}
                data-testid="button-export-html"
              >
                <Brain className="h-4 w-4 mr-2" />
                Export HTML
              </Button>
            </div>
          )}
        </div>
        <CardDescription>
          AI-powered maintenance and compliance reporting for marine equipment
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Report Generation Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {reportButtons.map((report, index) => (
            <Button
              key={index}
              variant="outline"
              className="h-auto p-4 flex flex-col items-start space-y-2 hover:shadow-md transition-shadow"
              onClick={() => generateReport(report.endpoint, report.params, report.label)}
              disabled={busy}
              data-testid={`button-generate-${report.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <div className="flex items-center space-x-2 w-full">
                <div className={`p-1 rounded ${report.color} text-white`}>
                  {report.icon}
                </div>
                <span className="font-medium text-sm">{report.label}</span>
              </div>
              <span className="text-xs text-muted-foreground text-left">
                {report.description}
              </span>
            </Button>
          ))}
        </div>

        {/* Status Indicator */}
        {busy && (
          <div className="flex items-center justify-center p-4 bg-muted rounded-lg" data-testid="status-generating">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            <span className="text-sm">Generating AI-powered report...</span>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg" data-testid="error-message">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
            </div>
          </div>
        )}

        {/* Report Output */}
        {lastReport && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Generated Report</h3>
              <Badge variant="outline" className="text-xs">
                {new Date(lastReport.metadata.generatedAt).toLocaleString()}
              </Badge>
            </div>
            
            {/* Report Header */}
            <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-900/20">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">{lastReport.metadata.title}</CardTitle>
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  <span>Type: {lastReport.metadata.reportType}</span>
                  {lastReport.metadata.equipmentFilter && lastReport.metadata.equipmentFilter !== 'all' && (
                    <span>• Filter: {lastReport.metadata.equipmentFilter}</span>
                  )}
                </div>
              </CardHeader>
            </Card>

            {/* Summary Section */}
            {lastReport.sections.summary && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(lastReport.sections.summary).map(([key, value]) => {
                      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                      return (
                        <div key={key} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                          <span className="text-sm font-medium">{label}:</span>
                          <span className="text-sm font-bold">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Analysis Section */}
            {lastReport.sections.analysis && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    AI Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  {/* Top Recommendations */}
                  {lastReport.sections.analysis.topRecommendations && (
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Top Recommendations
                      </h4>
                      <ul className="space-y-2">
                        {lastReport.sections.analysis.topRecommendations.map((rec: string, index: number) => (
                          <li key={index} className="flex gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <span className="font-bold text-green-600 dark:text-green-400 min-w-6">{index + 1}.</span>
                            <span className="text-sm">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Fleet Benchmarks */}
                  {lastReport.sections.analysis.fleetBenchmarks && (
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Fleet Benchmarks
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <h5 className="font-medium mb-2">Fleet Average</h5>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Health Index:</span>
                              <span className="font-bold">{lastReport.sections.analysis.fleetBenchmarks.fleetAverage.healthIndex}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Predicted Due Days:</span>
                              <span className="font-bold">{lastReport.sections.analysis.fleetBenchmarks.fleetAverage.predictedDueDays}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Maintenance Frequency:</span>
                              <span className="font-bold">{lastReport.sections.analysis.fleetBenchmarks.fleetAverage.maintenanceFrequency}/year</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                          <h5 className="font-medium mb-2">Performance Percentiles</h5>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Top 10%:</span>
                              <span className="font-bold text-green-600">{lastReport.sections.analysis.fleetBenchmarks.performancePercentiles.top10Percent}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Median:</span>
                              <span className="font-bold">{lastReport.sections.analysis.fleetBenchmarks.performancePercentiles.median}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Bottom 10%:</span>
                              <span className="font-bold text-red-600">{lastReport.sections.analysis.fleetBenchmarks.performancePercentiles.bottom10Percent}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Best and Worst Performers */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        {lastReport.sections.analysis.fleetBenchmarks.bestPerformers?.length > 0 && (
                          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <h5 className="font-medium mb-2 flex items-center gap-2">
                              <TrendingUp className="h-4 w-4" />
                              Best Performers
                            </h5>
                            <div className="space-y-2">
                              {lastReport.sections.analysis.fleetBenchmarks.bestPerformers.slice(0, 3).map((performer: any, index: number) => (
                                <div key={index} className="text-sm">
                                  <div className="font-medium">{performer.equipmentId}</div>
                                  <div className="text-xs text-muted-foreground">
                                    Health: {performer.healthIndex} • Days to Maintenance: {performer.daysToMaintenance}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {lastReport.sections.analysis.fleetBenchmarks.worstPerformers?.length > 0 && (
                          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                            <h5 className="font-medium mb-2 flex items-center gap-2">
                              <TrendingDown className="h-4 w-4" />
                              Worst Performers
                            </h5>
                            <div className="space-y-2">
                              {lastReport.sections.analysis.fleetBenchmarks.worstPerformers.slice(0, 3).map((performer: any, index: number) => (
                                <div key={index} className="text-sm">
                                  <div className="font-medium">{performer.equipmentId}</div>
                                  <div className="text-xs text-muted-foreground">
                                    Health: {performer.healthIndex} • Issues: {performer.issuesCount}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Equipment Comparisons */}
                  {lastReport.sections.analysis.equipmentComparisons?.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3">Cross-Equipment Comparisons</h4>
                      <div className="space-y-3">
                        {lastReport.sections.analysis.equipmentComparisons.slice(0, 5).map((comparison: any, index: number) => (
                          <div key={index} className="p-4 border rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                              <h5 className="font-medium">{comparison.equipmentId}</h5>
                              <Badge variant={comparison.relativePerformance === 'Top25%' ? 'default' : 
                                            comparison.relativePerformance === 'Above Average' ? 'secondary' :
                                            comparison.relativePerformance === 'Below Average' ? 'outline' : 'destructive'}>
                                {comparison.relativePerformance}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <div className="text-muted-foreground">Fleet Ranking:</div>
                                <div className="font-medium">#{comparison.fleetRanking}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">vs Fleet Avg:</div>
                                <div className={`font-medium ${comparison.healthIndexVsFleetAvg >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {comparison.healthIndexVsFleetAvg >= 0 ? '+' : ''}{comparison.healthIndexVsFleetAvg}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Summary */}
                  {lastReport.sections.analysis.summary && (
                    <div>
                      <h4 className="font-semibold mb-3">Analysis Summary</h4>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm leading-relaxed">{lastReport.sections.analysis.summary}</p>
                      </div>
                    </div>
                  )}

                </CardContent>
              </Card>
            )}

            {/* Overdue Items */}
            {lastReport.sections.overdue?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    Overdue Items ({lastReport.sections.overdue.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {lastReport.sections.overdue.slice(0, 5).map((item: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <span className="font-medium">{item.equipmentId}</span>
                        <span className="text-sm text-muted-foreground">{item.description || 'Maintenance required'}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Upcoming Maintenance */}
            {lastReport.sections.upcoming?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-500" />
                    Upcoming Maintenance ({lastReport.sections.upcoming.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {lastReport.sections.upcoming.slice(0, 5).map((item: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <span className="font-medium">{item.equipmentId}</span>
                        <span className="text-sm text-muted-foreground">{formatDateSgt(new Date(item.scheduledDate))}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Usage Tips */}
        <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
          <p className="font-medium mb-1">💡 Tips:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Reports use real system data from your ARUS database</li>
            <li>Set OPENAI_API_KEY in Settings for AI-powered analysis</li>
            <li>Without API key, reports use structured fallback analysis</li>
            <li>Generated reports can be downloaded as Markdown files</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}