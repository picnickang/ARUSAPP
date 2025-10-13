import { useQuery } from "@tanstack/react-query";
import { FileText, Download, Calendar, TrendingUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { fetchEquipmentHealth, fetchWorkOrders, fetchPdmScores } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { formatDateSgt } from "@/lib/time-utils";
import { useState } from "react";
import ReportsConsole from "@/components/ReportsConsole";

export default function Reports() {
  const [selectedEquipment, setSelectedEquipment] = useState<string>("all");
  const [selectedStandard, setSelectedStandard] = useState<string>("ISM");
  const [reportType, setReportType] = useState<string>("fleet");

  const { data: equipmentHealth, isLoading: healthLoading } = useQuery({
    queryKey: ["/api/equipment/health"],
    queryFn: fetchEquipmentHealth,
  });

  const { data: workOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/work-orders"],
    queryFn: () => fetchWorkOrders(),
  });

  const { data: pdmScores, isLoading: scoresLoading } = useQuery({
    queryKey: ["/api/pdm/scores"],
    queryFn: () => fetchPdmScores(),
  });

  const isLoading = healthLoading || ordersLoading || scoresLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading report data...</div>
      </div>
    );
  }

  const equipmentOptions = equipmentHealth?.map(eq => ({ id: eq.id, vessel: eq.vessel })) || [];

  const generateReport = async () => {
    try {
      const response = await fetch('/api/reports/generate/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: reportType,
          equipmentId: selectedEquipment === 'all' ? undefined : selectedEquipment,
          title: `Marine ${reportType === 'compliance' ? 'Compliance' : 'Fleet'} Report - ${formatDateSgt(new Date())}`
        })
      });
      
      if (!response.ok) throw new Error('Failed to generate report');
      
      const reportData = await response.json();
      generatePDF(reportData);
    } catch (error) {
      console.error('Report generation failed:', error);
    }
  };

  const generateComplianceReport = async (complianceType: string) => {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000); // Last 90 days
      
      const params = new URLSearchParams({
        standard: selectedStandard,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        ...(selectedEquipment !== 'all' && { equipmentId: selectedEquipment })
      });
      
      const response = await fetch(`/api/reports/compliance/${complianceType}?${params}`);
      if (!response.ok) throw new Error('Failed to generate compliance report');
      
      const reportData = await response.json();
      generateCompliancePDF(reportData);
    } catch (error) {
      console.error('Compliance report generation failed:', error);
    }
  };

  const exportCSV = async () => {
    try {
      const params = new URLSearchParams({
        type: 'all',
        ...(selectedEquipment !== 'all' && { equipmentId: selectedEquipment })
      });
      
      const response = await fetch(`/api/reports/export/csv?${params}`);
      if (!response.ok) throw new Error('Failed to export CSV');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'report.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('CSV export failed:', error);
    }
  };

  const exportJSON = async () => {
    try {
      const params = new URLSearchParams({
        type: 'all',
        ...(selectedEquipment !== 'all' && { equipmentId: selectedEquipment })
      });
      
      const response = await fetch(`/api/reports/export/json?${params}`);
      if (!response.ok) throw new Error('Failed to export JSON');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'report.json';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('JSON export failed:', error);
    }
  };

  const generatePDF = async (reportData: any) => {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF();
    
    // Set up the document
    pdf.setFontSize(20);
    pdf.text(reportData.metadata.title, 20, 20);
    
    pdf.setFontSize(12);
    pdf.text(`Generated: ${formatDateSgt(new Date(reportData.metadata.generatedAt))}`, 20, 35);
    pdf.text(`Report Type: ${reportData.metadata.reportType}`, 20, 45);
    
    let yPosition = 60;
    
    // Summary Section
    pdf.setFontSize(16);
    pdf.text('Fleet Summary', 20, yPosition);
    yPosition += 15;
    
    pdf.setFontSize(12);
    const summary = reportData.sections.summary;
    pdf.text(`Total Equipment: ${summary.totalEquipment}`, 20, yPosition);
    yPosition += 10;
    pdf.text(`Average Health Index: ${summary.avgHealthIndex}%`, 20, yPosition);
    yPosition += 10;
    pdf.text(`Open Work Orders: ${summary.openWorkOrders}`, 20, yPosition);
    yPosition += 10;
    pdf.text(`Critical Equipment: ${summary.criticalEquipment}`, 20, yPosition);
    yPosition += 20;
    
    // Equipment Health Section
    if (reportData.sections.equipmentHealth?.length > 0) {
      pdf.setFontSize(16);
      pdf.text('Equipment Health Status', 20, yPosition);
      yPosition += 15;
      
      pdf.setFontSize(10);
      reportData.sections.equipmentHealth.slice(0, 15).forEach((eq: any) => {
        if (yPosition > 270) {
          pdf.addPage();
          yPosition = 20;
        }
        pdf.text(`${eq.id} (${eq.vessel}): ${eq.healthIndex}% - Due in ${eq.predictedDueDays} days`, 20, yPosition);
        yPosition += 8;
      });
    }
    
    // Save the PDF
    const filename = `marine_report_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(filename);
  };

  const generateCompliancePDF = async (reportData: any) => {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF();
    
    // Set up the document
    pdf.setFontSize(20);
    pdf.text(`Marine Compliance Report - ${reportData.standard}`, 20, 20);
    
    pdf.setFontSize(12);
    pdf.text(`Generated: ${formatDateSgt(new Date())}`, 20, 35);
    pdf.text(`Report Type: ${reportData.type}`, 20, 45);
    pdf.text(`Period: ${formatDateSgt(new Date(reportData.period.startDate))} - ${formatDateSgt(new Date(reportData.period.endDate))}`, 20, 55);
    
    let yPosition = 70;
    
    // Compliance Summary
    pdf.setFontSize(16);
    pdf.text('Compliance Summary', 20, yPosition);
    yPosition += 15;
    
    pdf.setFontSize(12);
    const summary = reportData.summary;
    
    if (reportData.type === 'maintenance-compliance') {
      pdf.text(`Total Maintenance Records: ${summary.totalMaintenanceRecords}`, 20, yPosition);
      yPosition += 10;
      pdf.text(`Completed On Time: ${summary.completedOnTime}`, 20, yPosition);
      yPosition += 10;
      pdf.text(`Overdue: ${summary.overdue}`, 20, yPosition);
      yPosition += 10;
      pdf.text(`Compliance Rate: ${summary.complianceRate}%`, 20, yPosition);
      yPosition += 20;
      
      // Maintenance Records
      if (reportData.maintenanceRecords?.length > 0) {
        pdf.setFontSize(16);
        pdf.text('Recent Maintenance Records', 20, yPosition);
        yPosition += 15;
        
        pdf.setFontSize(10);
        reportData.maintenanceRecords.slice(0, 10).forEach((record: any) => {
          if (yPosition > 270) {
            pdf.addPage();
            yPosition = 20;
          }
          pdf.text(`${record.equipmentId}: ${record.maintenanceType} - ${record.completionStatus}`, 20, yPosition);
          yPosition += 8;
        });
      }
    } else if (reportData.type === 'alert-response') {
      pdf.text(`Total Alerts: ${summary.totalAlerts}`, 20, yPosition);
      yPosition += 10;
      pdf.text(`Acknowledged: ${summary.acknowledgedAlerts}`, 20, yPosition);
      yPosition += 10;
      pdf.text(`Critical Alerts: ${summary.criticalAlerts}`, 20, yPosition);
      yPosition += 10;
      pdf.text(`Response Rate: ${summary.responseRate}%`, 20, yPosition);
      yPosition += 20;
      
      // Recent Alerts
      if (reportData.alerts?.length > 0) {
        pdf.setFontSize(16);
        pdf.text('Recent Alerts', 20, yPosition);
        yPosition += 15;
        
        pdf.setFontSize(10);
        reportData.alerts.slice(0, 10).forEach((alert: any) => {
          if (yPosition > 270) {
            pdf.addPage();
            yPosition = 20;
          }
          pdf.text(`${alert.equipmentId}: ${alert.alertType} - ${alert.acknowledged ? 'ACK' : 'PENDING'}`, 20, yPosition);
          yPosition += 8;
        });
      }
    }
    
    // Save the PDF
    const filename = `marine_compliance_${reportData.type}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(filename);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 md:px-6 py-4">
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="min-w-0">
            <h2 className="text-xl md:text-2xl font-bold text-foreground truncate">Reports & Analytics</h2>
            <p className="text-sm md:text-base text-muted-foreground">Generate maintenance reports and export fleet data</p>
          </div>
          <div className="flex flex-col space-y-3 md:flex-row md:items-center md:space-y-0 md:space-x-4">
            <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2">
              <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
                <SelectTrigger className="w-full md:w-48" data-testid="select-equipment">
                  <SelectValue placeholder="Select equipment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Equipment</SelectItem>
                  {equipmentOptions.map((equipment) => (
                    <SelectItem key={equipment.id} value={equipment.id}>
                      {equipment.id} - {equipment.vessel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedStandard} onValueChange={setSelectedStandard}>
                <SelectTrigger className="w-full md:w-32" data-testid="select-standard">
                  <SelectValue placeholder="Standard" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ISM">ISM</SelectItem>
                  <SelectItem value="SOLAS">SOLAS</SelectItem>
                  <SelectItem value="MLC">MLC</SelectItem>
                  <SelectItem value="MARPOL">MARPOL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={generateReport}
              className="bg-primary text-primary-foreground hover:bg-primary/90 min-h-[44px] touch-manipulation"
              data-testid="button-generate-report"
            >
              <FileText className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Generate Report</span>
              <span className="sm:hidden">Generate</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Report Types */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <Card 
            className="cursor-pointer hover:bg-muted/50 transition-colors" 
            data-testid="card-health-report"
            onClick={() => {
              setReportType('health');
              generateReport();
            }}
          >
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center space-x-3 md:space-x-4">
                <div className="bg-chart-3/20 p-2 md:p-3 rounded-lg flex-shrink-0">
                  <TrendingUp className="text-chart-3" size={20} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground text-sm md:text-base">Health Report</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">Equipment condition analysis</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:bg-muted/50 transition-colors" 
            data-testid="card-maintenance-report"
            onClick={() => {
              setReportType('maintenance');
              generateReport();
            }}
          >
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center space-x-3 md:space-x-4">
                <div className="bg-chart-2/20 p-2 md:p-3 rounded-lg flex-shrink-0">
                  <Calendar className="text-chart-2" size={20} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground text-sm md:text-base">Maintenance Report</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">Work order history and scheduling</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:bg-muted/50 transition-colors" 
            data-testid="card-fleet-report"
            onClick={() => {
              setReportType('fleet');
              generateReport();
            }}
          >
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center space-x-3 md:space-x-4">
                <div className="bg-primary/20 p-2 md:p-3 rounded-lg flex-shrink-0">
                  <FileText className="text-primary" size={20} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground text-sm md:text-base">Fleet Summary</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">Comprehensive fleet overview</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Marine Compliance Reports */}
        <div className="space-y-3 md:space-y-4">
          <h3 className="text-base md:text-lg font-semibold text-foreground">Marine Compliance Reports</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors" data-testid="card-maintenance-compliance">
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col space-y-3 md:flex-row md:items-center md:justify-between md:space-y-0">
                  <div className="flex items-center space-x-3 md:space-x-4 min-w-0">
                    <div className="bg-blue-500/20 p-2 md:p-3 rounded-lg flex-shrink-0">
                      <Calendar className="text-blue-500" size={20} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground text-sm md:text-base">Maintenance Compliance</h3>
                      <p className="text-xs md:text-sm text-muted-foreground">ISM/SOLAS maintenance compliance tracking</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="min-h-[44px] touch-manipulation flex-shrink-0"
                    onClick={() => generateComplianceReport('maintenance-compliance')}
                    data-testid="button-maintenance-compliance"
                  >
                    Generate
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:bg-muted/50 transition-colors" data-testid="card-alert-response">
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col space-y-3 md:flex-row md:items-center md:justify-between md:space-y-0">
                  <div className="flex items-center space-x-3 md:space-x-4 min-w-0">
                    <div className="bg-red-500/20 p-2 md:p-3 rounded-lg flex-shrink-0">
                      <TrendingUp className="text-red-500" size={20} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground text-sm md:text-base">Alert Response Compliance</h3>
                      <p className="text-xs md:text-sm text-muted-foreground">Safety alert response and acknowledgment tracking</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="min-h-[44px] touch-manipulation flex-shrink-0"
                    onClick={() => generateComplianceReport('alert-response')}
                    data-testid="button-alert-response"
                  >
                    Generate
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Report Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Equipment Health Summary</CardTitle>
              <p className="text-sm text-muted-foreground">
                Current health status across monitored equipment
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {equipmentHealth?.map((equipment) => (
                  <div 
                    key={equipment.id} 
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg touch-manipulation"
                    data-testid={`equipment-summary-${equipment.id}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground text-sm md:text-base truncate">{equipment.id}</p>
                      <p className="text-xs md:text-sm text-muted-foreground truncate">{equipment.vessel}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm md:text-base font-medium ${
                        equipment.healthIndex >= 75 ? "text-chart-3" :
                        equipment.healthIndex >= 50 ? "text-chart-2" : "text-destructive"
                      }`}>
                        {equipment.healthIndex}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Due: {equipment.predictedDueDays}d
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Work Orders</CardTitle>
              <p className="text-sm text-muted-foreground">
                Latest maintenance activities and requests
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workOrders?.slice(0, 8).map((order) => (
                  <div 
                    key={order.id} 
                    className="flex items-center justify-between p-3 border border-border rounded-lg touch-manipulation"
                    data-testid={`order-summary-${order.id}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground text-sm md:text-base truncate">{order.id}</p>
                      <p className="text-xs md:text-sm text-muted-foreground truncate">{order.equipmentId}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm md:text-base font-medium ${
                        order.status === "completed" ? "text-chart-3" :
                        order.status === "in_progress" ? "text-chart-2" : "text-muted-foreground"
                      }`}>
                        {order.status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.createdAt 
                          ? formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })
                          : "Unknown"
                        }
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Export Options */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Data Export</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Export data for external analysis and reporting
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="default" data-testid="button-export-menu">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={exportCSV} data-testid="menuitem-export-csv">
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportJSON} data-testid="menuitem-export-json">
                    <Download className="mr-2 h-4 w-4" />
                    Export JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={generateReport} data-testid="menuitem-export-pdf">
                    <FileText className="mr-2 h-4 w-4" />
                    Export PDF
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={exportJSON} data-testid="menuitem-backup-data">
                    <Calendar className="mr-2 h-4 w-4" />
                    Backup Data
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Use the export menu above to download data in various formats for external analysis and reporting.
          </CardContent>
        </Card>

        {/* LLM Reports Console */}
        <div className="mt-8">
          <ReportsConsole />
        </div>
      </div>
    </div>
  );
}
