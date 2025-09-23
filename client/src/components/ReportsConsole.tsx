import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, FileText, BarChart3, Shield, AlertCircle, Download, Loader2 } from "lucide-react";

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
  const [output, setOutput] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastReport, setLastReport] = useState<ReportResponse | null>(null);

  async function generateReport(endpoint: string, params: any = {}, reportName: string) {
    setBusy(true);
    setError(null);
    setOutput("");
    
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
      
      // Format structured data for display
      const formattedOutput = formatReportForDisplay(result);
      setOutput(formattedOutput);
      
    } catch (error: any) {
      console.error(`${reportName} generation failed:`, error);
      setError(error.message || `Failed to generate ${reportName}`);
    } finally {
      setBusy(false);
    }
  }

  function formatReportForDisplay(report: ReportResponse): string {
    const { metadata, sections } = report;
    let output = `# ${metadata.title}\n\n`;
    output += `**Generated:** ${new Date(metadata.generatedAt).toLocaleString()}\n`;
    output += `**Type:** ${metadata.reportType}\n`;
    if (metadata.equipmentFilter && metadata.equipmentFilter !== 'all') {
      output += `**Filter:** ${metadata.equipmentFilter}\n`;
    }
    output += '\n## Summary\n';
    
    // Format summary section
    if (sections.summary) {
      Object.entries(sections.summary).forEach(([key, value]) => {
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        output += `- **${label}:** ${value}\n`;
      });
    }
    
    // Add analysis if available
    if (sections.analysis) {
      output += '\n## AI Analysis\n';
      if (sections.analysis.topRecommendations) {
        output += '\n### Top Recommendations\n';
        sections.analysis.topRecommendations.forEach((rec: string, index: number) => {
          output += `${index + 1}. ${rec}\n`;
        });
      }
      if (sections.analysis.summary) {
        output += `\n### Summary\n${sections.analysis.summary}\n`;
      }
    }
    
    // Add key data sections
    if (sections.overdue?.length > 0) {
      output += `\n## Overdue Items (${sections.overdue.length})\n`;
      sections.overdue.slice(0, 5).forEach((item: any) => {
        output += `- ${item.equipmentId}: ${item.description || 'Maintenance required'}\n`;
      });
    }
    
    if (sections.upcoming?.length > 0) {
      output += `\n## Upcoming Maintenance (${sections.upcoming.length})\n`;
      sections.upcoming.slice(0, 5).forEach((item: any) => {
        output += `- ${item.equipmentId}: ${new Date(item.scheduledDate).toLocaleDateString()}\n`;
      });
    }
    
    return output;
  }

  function downloadReport() {
    if (!lastReport) return;
    
    const formattedReport = formatReportForDisplay(lastReport);
    const blob = new Blob([formattedReport], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${lastReport.metadata.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.md`;
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
        {output && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Generated Report</h3>
              {lastReport && (
                <Badge variant="outline" className="text-xs">
                  {new Date(lastReport.metadata.generatedAt).toLocaleString()}
                </Badge>
              )}
            </div>
            <div 
              className="bg-muted/50 border rounded-lg p-4 max-h-96 overflow-auto text-xs font-mono leading-relaxed whitespace-pre-wrap"
              data-testid="report-output"
            >
              {output}
            </div>
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