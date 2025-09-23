import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Upload, 
  FileText, 
  Database, 
  CheckCircle, 
  AlertCircle, 
  Download,
  Trash2,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

type TelemetryRow = {
  ts: string;
  vessel: string;
  src: string;
  sig: string;
  value?: number;
  unit?: string;
};

type ImportResult = {
  ok: boolean;
  inserted: number;
  processed?: number;
  message: string;
  errors?: any[];
};

type RawTelemetry = {
  id: string;
  vessel: string;
  ts: Date;
  src: string;
  sig: string;
  value: number | null;
  unit: string | null;
  createdAt: Date;
};

async function fetchRawTelemetry(): Promise<RawTelemetry[]> {
  const response = await fetch("/api/raw-telemetry");
  if (!response.ok) throw new Error("Failed to fetch raw telemetry data");
  return response.json();
}

export default function ManualTelemetryUpload() {
  const { toast } = useToast();
  const [csvData, setCsvData] = useState("");
  const [jsonData, setJsonData] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [lastResult, setLastResult] = useState<ImportResult | null>(null);

  // Fetch existing raw telemetry data
  const { data: telemetryData, isLoading: dataLoading, refetch } = useQuery({
    queryKey: ["/api/raw-telemetry"],
    queryFn: fetchRawTelemetry,
    refetchInterval: 30000,
  });

  const csvImportMutation = useMutation({
    mutationFn: async (csvData: string) => {
      setUploadProgress(50);
      return apiRequest("POST", "/api/import/telemetry/csv", { csvData });
    },
    onSuccess: (result: ImportResult) => {
      setUploadProgress(100);
      setLastResult(result);
      queryClient.invalidateQueries({ queryKey: ["/api/raw-telemetry"] });
      toast({
        title: "CSV Import Successful",
        description: result.message,
      });
      setTimeout(() => setUploadProgress(0), 2000);
    },
    onError: (error: any) => {
      setUploadProgress(0);
      setLastResult({
        ok: false,
        inserted: 0,
        message: error?.message || "CSV import failed",
        errors: error?.errors
      });
      toast({
        title: "CSV Import Failed",
        description: error?.message || "Failed to import CSV data",
        variant: "destructive",
      });
    },
  });

  const jsonImportMutation = useMutation({
    mutationFn: async (jsonData: string) => {
      setUploadProgress(50);
      const parsed = JSON.parse(jsonData);
      return apiRequest("POST", "/api/import/telemetry/json", parsed);
    },
    onSuccess: (result: ImportResult) => {
      setUploadProgress(100);
      setLastResult(result);
      queryClient.invalidateQueries({ queryKey: ["/api/raw-telemetry"] });
      toast({
        title: "JSON Import Successful",
        description: result.message,
      });
      setTimeout(() => setUploadProgress(0), 2000);
    },
    onError: (error: any) => {
      setUploadProgress(0);
      setLastResult({
        ok: false,
        inserted: 0,
        message: error?.message || "JSON import failed",
        errors: error?.errors
      });
      toast({
        title: "JSON Import Failed",
        description: error?.message || "Failed to import JSON data",
        variant: "destructive",
      });
    },
  });

  const handleCsvImport = () => {
    if (!csvData.trim()) {
      toast({
        title: "No Data",
        description: "Please enter CSV data to import",
        variant: "destructive",
      });
      return;
    }
    setUploadProgress(25);
    csvImportMutation.mutate(csvData);
  };

  const handleJsonImport = () => {
    if (!jsonData.trim()) {
      toast({
        title: "No Data",
        description: "Please enter JSON data to import",
        variant: "destructive",
      });
      return;
    }
    
    try {
      JSON.parse(jsonData);
    } catch (error) {
      toast({
        title: "Invalid JSON",
        description: "Please enter valid JSON data",
        variant: "destructive",
      });
      return;
    }
    
    setUploadProgress(25);
    jsonImportMutation.mutate(jsonData);
  };

  const downloadSampleCsv = () => {
    const sampleCsv = `ts,vessel,src,sig,value,unit
2025-01-01T00:00:00Z,MV Atlantic,PUMP1,flow_rate,250.5,gpm
2025-01-01T00:05:00Z,MV Atlantic,PUMP1,pressure,85.2,psi
2025-01-01T00:10:00Z,MV Atlantic,ENG1,temperature,75.8,celsius
2025-01-01T00:15:00Z,MV Pacific,GEN1,frequency,60.0,hz`;
    
    const blob = new Blob([sampleCsv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample-telemetry.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadSampleJson = () => {
    const sampleJson = {
      rows: [
        {
          ts: "2025-01-01T00:00:00Z",
          vessel: "MV Atlantic",
          src: "PUMP1",
          sig: "flow_rate",
          value: 250.5,
          unit: "gpm"
        },
        {
          ts: "2025-01-01T00:05:00Z",
          vessel: "MV Atlantic",
          src: "PUMP1",
          sig: "pressure",
          value: 85.2,
          unit: "psi"
        }
      ]
    };
    
    const blob = new Blob([JSON.stringify(sampleJson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample-telemetry.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearData = (type: 'csv' | 'json') => {
    if (type === 'csv') {
      setCsvData("");
    } else {
      setJsonData("");
    }
    setLastResult(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manual Telemetry Upload</h1>
        <p className="text-muted-foreground">
          Import telemetry data from CSV files or JSON format for bulk data loading and testing.
        </p>
      </div>

      {/* Upload Progress */}
      {uploadProgress > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Import Progress</span>
                  <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Result */}
      {lastResult && (
        <Card className={lastResult.ok ? "border-green-500" : "border-destructive"}>
          <CardContent className="pt-6">
            <div className="flex items-start space-x-4">
              {lastResult.ok ? (
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-medium">
                  {lastResult.ok ? "Import Successful" : "Import Failed"}
                </p>
                <p className="text-sm text-muted-foreground">{lastResult.message}</p>
                {lastResult.processed && (
                  <p className="text-sm text-muted-foreground">
                    Processed {lastResult.processed} rows, inserted {lastResult.inserted} records
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Interface */}
      <Tabs defaultValue="csv" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="csv" data-testid="tab-csv-upload">
            <FileText className="w-4 h-4 mr-2" />
            CSV Upload
          </TabsTrigger>
          <TabsTrigger value="json" data-testid="tab-json-upload">
            <Database className="w-4 h-4 mr-2" />
            JSON Upload
          </TabsTrigger>
        </TabsList>

        <TabsContent value="csv">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                CSV Data Import
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={downloadSampleCsv}
                    data-testid="button-download-csv-sample"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Sample CSV
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => clearData('csv')}
                    data-testid="button-clear-csv"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                Upload telemetry data in CSV format. Required columns: ts, vessel, src, sig. Optional: value, unit.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="csv-data" className="text-sm font-medium">CSV Data</Label>
                <Textarea
                  id="csv-data"
                  placeholder="ts,vessel,src,sig,value,unit&#10;2025-01-01T00:00:00Z,MV Atlantic,PUMP1,flow_rate,250.5,gpm&#10;2025-01-01T00:05:00Z,MV Atlantic,PUMP1,pressure,85.2,psi"
                  value={csvData}
                  onChange={(e) => setCsvData(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                  data-testid="textarea-csv-data"
                />
              </div>
              <Button 
                onClick={handleCsvImport}
                disabled={!csvData.trim() || csvImportMutation.isPending}
                className="w-full"
                data-testid="button-import-csv"
              >
                <Upload className="w-4 h-4 mr-2" />
                {csvImportMutation.isPending ? "Importing..." : "Import CSV Data"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="json">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                JSON Data Import
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={downloadSampleJson}
                    data-testid="button-download-json-sample"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Sample JSON
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => clearData('json')}
                    data-testid="button-clear-json"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                Upload telemetry data in JSON format. Use the "rows" array with telemetry objects.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="json-data" className="text-sm font-medium">JSON Data</Label>
                <Textarea
                  id="json-data"
                  placeholder='{"rows": [{"ts": "2025-01-01T00:00:00Z", "vessel": "MV Atlantic", "src": "PUMP1", "sig": "flow_rate", "value": 250.5, "unit": "gpm"}]}'
                  value={jsonData}
                  onChange={(e) => setJsonData(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                  data-testid="textarea-json-data"
                />
              </div>
              <Button 
                onClick={handleJsonImport}
                disabled={!jsonData.trim() || jsonImportMutation.isPending}
                className="w-full"
                data-testid="button-import-json"
              >
                <Upload className="w-4 h-4 mr-2" />
                {jsonImportMutation.isPending ? "Importing..." : "Import JSON Data"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Imported Data Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Database className="mr-2 h-5 w-5" />
              Imported Telemetry Data
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              data-testid="button-refresh-data"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </CardTitle>
          <CardDescription>
            Recently imported raw telemetry data. This data can be processed and transformed into equipment telemetry.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dataLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading telemetry data...
            </div>
          ) : telemetryData && telemetryData.length > 0 ? (
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {telemetryData.slice(0, 50).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <Badge variant="outline">{item.vessel}</Badge>
                        <span className="font-mono text-sm">{item.src}</span>
                        <span className="text-sm text-muted-foreground">{item.sig}</span>
                      </div>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-sm font-medium">
                          {item.value !== null ? `${item.value} ${item.unit || ''}` : 'N/A'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(item.ts), 'MMM d, yyyy HH:mm:ss')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {telemetryData.length > 50 && (
                  <div className="text-center py-4 text-muted-foreground">
                    ... and {telemetryData.length - 50} more records
                  </div>
                )}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No telemetry data imported yet. Upload some data using the tabs above.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}