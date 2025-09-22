import { useQuery } from "@tanstack/react-query";
import { FileText, Download, Calendar, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchEquipmentHealth, fetchWorkOrders, fetchPdmScores } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

export default function Reports() {
  const [selectedEquipment, setSelectedEquipment] = useState<string>("all");

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

  const generateReport = () => {
    console.log("Generating report for:", selectedEquipment);
    // Implement report generation logic
  };

  const exportData = () => {
    console.log("Exporting data...");
    // Implement data export logic
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Reports & Analytics</h2>
            <p className="text-muted-foreground">Generate maintenance reports and export fleet data</p>
          </div>
          <div className="flex items-center space-x-4">
            <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
              <SelectTrigger className="w-48" data-testid="select-equipment">
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
            <Button 
              onClick={generateReport}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              data-testid="button-generate-report"
            >
              <FileText className="mr-2 h-4 w-4" />
              Generate Report
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Report Types */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" data-testid="card-health-report">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="bg-chart-3/20 p-3 rounded-lg">
                  <TrendingUp className="text-chart-3" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Health Report</h3>
                  <p className="text-sm text-muted-foreground">Equipment condition analysis</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" data-testid="card-maintenance-report">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="bg-chart-2/20 p-3 rounded-lg">
                  <Calendar className="text-chart-2" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Maintenance Report</h3>
                  <p className="text-sm text-muted-foreground">Work order history and scheduling</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" data-testid="card-fleet-report">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="bg-primary/20 p-3 rounded-lg">
                  <FileText className="text-primary" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Fleet Summary</h3>
                  <p className="text-sm text-muted-foreground">Comprehensive fleet overview</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Report Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    data-testid={`equipment-summary-${equipment.id}`}
                  >
                    <div>
                      <p className="font-medium text-foreground">{equipment.id}</p>
                      <p className="text-sm text-muted-foreground">{equipment.vessel}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${
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
                    className="flex items-center justify-between p-3 border border-border rounded-lg"
                    data-testid={`order-summary-${order.id}`}
                  >
                    <div>
                      <p className="font-medium text-foreground">{order.id}</p>
                      <p className="text-sm text-muted-foreground">{order.equipmentId}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${
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
            <CardTitle>Data Export</CardTitle>
            <p className="text-sm text-muted-foreground">
              Export data for external analysis and reporting
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center justify-center space-y-2"
                onClick={exportData}
                data-testid="button-export-csv"
              >
                <Download className="h-5 w-5" />
                <span>Export CSV</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center justify-center space-y-2"
                onClick={exportData}
                data-testid="button-export-pdf"
              >
                <FileText className="h-5 w-5" />
                <span>Export PDF</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center justify-center space-y-2"
                onClick={exportData}
                data-testid="button-export-json"
              >
                <Download className="h-5 w-5" />
                <span>Export JSON</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center justify-center space-y-2"
                onClick={exportData}
                data-testid="button-backup-data"
              >
                <Calendar className="h-5 w-5" />
                <span>Backup Data</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
