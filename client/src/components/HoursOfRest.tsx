import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload, Download, Calendar, FileCheck } from 'lucide-react';
import { useCustomMutation } from '@/hooks/useCrudMutations';

interface Crew {
  id: string;
  name: string;
  rank: string;
  vesselId?: string;
}

interface RestSheetData {
  sheet: {
    id: string;
    crewId: string;
    year: number;
    month: string;
    vesselId?: string;
    createdAt: string;
  } | null;
  days: Array<{
    id: string;
    sheetId: string;
    date: string;
    hourlyFlags: string; // 24-character string of 0s and 1s
  }>;
}

interface ComplianceResult {
  compliant: boolean;
  violations: Array<{
    date: string;
    type: string;
    message: string;
  }>;
  summary: {
    totalDays: number;
    violationDays: number;
    compliancePercentage: number;
  };
}

export function HoursOfRest() {
  const { toast } = useToast();
  
  const [selectedCrew, setSelectedCrew] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [importFile, setImportFile] = useState<File | null>(null);
  const [complianceResult, setComplianceResult] = useState<ComplianceResult | null>(null);

  // Fetch crew members
  const { data: crew = [], isLoading: crewLoading } = useQuery({
    queryKey: ['/api/crew'],
    refetchInterval: 30000
  });

  // Fetch rest data for selected crew and month
  const { data: restData, isLoading: restLoading, refetch: refetchRestData } = useQuery<RestSheetData>({
    queryKey: ['/api/stcw/rest', selectedCrew, selectedYear, selectedMonth],
    enabled: !!selectedCrew,
    refetchInterval: 30000,
    queryFn: async () => {
      const response = await fetch(`/api/stcw/rest/${selectedCrew}/${selectedYear}/${selectedMonth}`);
      if (!response.ok) throw new Error('Failed to fetch rest data');
      return response.json();
    }
  });

  // Import rest data mutation
  const importMutation = useCustomMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/stcw/import', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      
      return response.json();
    },
    invalidateKeys: () => [['/api/stcw/rest'], ['/api/stcw/rest', selectedCrew, selectedYear, selectedMonth]],
    successMessage: (data) => `Imported rest data for ${data.sheets} crew members`,
    onSuccess: () => {
      setImportFile(null);
      refetchRestData();
    },
  });

  // Compliance check mutation
  const complianceMutation = useCustomMutation({
    mutationFn: async (params: { crewId: string; year: number; month: string }) => {
      const response = await fetch(`/api/stcw/compliance/${params.crewId}/${params.year}/${params.month}`);
      if (!response.ok) throw new Error('Compliance check failed');
      return response.json();
    },
    successMessage: (data) => `${data.compliant ? 'Compliant' : 'Violations found'}`,
    onSuccess: (data) => {
      setComplianceResult(data);
    },
  });

  // PDF export function
  const exportPDF = async () => {
    if (!selectedCrew) {
      toast({ title: "Please select a crew member", variant: "destructive" });
      return;
    }

    try {
      const response = await fetch(`/api/stcw/export/${selectedCrew}/${selectedYear}/${selectedMonth}`);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stcw_rest_${selectedCrew}_${selectedYear}_${selectedMonth}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({ title: "PDF exported successfully" });
    } catch (error) {
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  // Handle file import
  const handleImport = () => {
    if (!importFile) {
      toast({ title: "Please select a file", variant: "destructive" });
      return;
    }

    const formData = new FormData();
    formData.append('file', importFile);
    importMutation.mutate(formData);
  };

  // Generate calendar grid for rest visualization
  const calendarGrid = useMemo(() => {
    if (!restData?.days) return null;

    const daysInMonth = new Date(selectedYear, parseInt(selectedMonth), 0).getDate();
    const grid = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${selectedYear}-${selectedMonth.padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const dayData = restData.days?.find((d: any) => d.date === dateStr);
      const hourlyFlags = dayData?.hourlyFlags || '000000000000000000000000';
      
      // Count rest hours (1s in the flags)
      const restHours = (hourlyFlags.match(/1/g) || []).length;
      
      grid.push({
        day,
        date: dateStr,
        restHours,
        hourlyFlags,
        compliant: restHours >= 10 // Basic 10h/24h rule
      });
    }

    return grid;
  }, [restData, selectedYear, selectedMonth]);

  const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-hours-of-rest">STCW Hours of Rest</h1>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Rest Data Management</CardTitle>
          <CardDescription>Import, view, and export STCW Hours of Rest data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Import */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="import-file">Import CSV File</Label>
              <Input
                id="import-file"
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                data-testid="input-import-file"
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleImport} 
                disabled={!importFile || importMutation.isPending}
                data-testid="button-import"
              >
                <Upload className="w-4 h-4 mr-2" />
                {importMutation.isPending ? 'Importing...' : 'Import'}
              </Button>
            </div>
          </div>

          {/* Selection Controls */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="crew-select">Crew Member</Label>
              <Select value={selectedCrew} onValueChange={setSelectedCrew}>
                <SelectTrigger data-testid="select-crew">
                  <SelectValue placeholder="Select crew member" />
                </SelectTrigger>
                <SelectContent>
                  {(crew as Crew[]).map((member: Crew) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name} - {member.rank}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="year-select">Year</Label>
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger data-testid="select-year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="month-select">Month</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger data-testid="select-month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end space-x-2">
              <Button 
                onClick={() => complianceMutation.mutate({ crewId: selectedCrew, year: selectedYear, month: selectedMonth })}
                disabled={!selectedCrew || complianceMutation.isPending}
                variant="outline"
                data-testid="button-check-compliance"
              >
                <FileCheck className="w-4 h-4 mr-2" />
                Check Compliance
              </Button>
              <Button 
                onClick={exportPDF}
                disabled={!selectedCrew}
                variant="outline"
                data-testid="button-export-pdf"
              >
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Results */}
      {complianceResult && (
        <Card>
          <CardHeader>
            <CardTitle className={`flex items-center ${complianceResult.compliant ? 'text-green-600' : 'text-red-600'}`}>
              <FileCheck className="w-5 h-5 mr-2" />
              Compliance Check Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center" data-testid="text-total-days">
                <div className="text-2xl font-bold">{complianceResult.summary.totalDays}</div>
                <div className="text-sm text-muted-foreground">Total Days</div>
              </div>
              <div className="text-center" data-testid="text-violation-days">
                <div className="text-2xl font-bold text-red-600">{complianceResult.summary.violationDays}</div>
                <div className="text-sm text-muted-foreground">Violation Days</div>
              </div>
              <div className="text-center" data-testid="text-compliance-percentage">
                <div className="text-2xl font-bold text-green-600">{complianceResult.summary.compliancePercentage.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Compliance</div>
              </div>
            </div>

            {complianceResult.violations.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold">Violations:</h4>
                <div className="space-y-1" data-testid="list-violations">
                  {complianceResult.violations.map((violation, index) => (
                    <div key={index} className="text-sm p-2 bg-red-50 border border-red-200 rounded">
                      <strong>{violation.date}</strong> - {violation.type}: {violation.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Rest Calendar */}
      {selectedCrew && calendarGrid && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Rest Hours Calendar - {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
            </CardTitle>
            <CardDescription>
              Daily rest hours visualization (green = compliant ≥10h, red = violation &lt;10h)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1" data-testid="calendar-rest-grid">
              {/* Day headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-2 text-center font-semibold text-sm">
                  {day}
                </div>
              ))}
              
              {/* Calendar days */}
              {calendarGrid.map((dayData) => (
                <div 
                  key={dayData.day}
                  className={`p-2 text-center text-xs border rounded ${
                    dayData.compliant 
                      ? 'bg-green-100 border-green-300 text-green-800' 
                      : 'bg-red-100 border-red-300 text-red-800'
                  }`}
                  title={`${dayData.date}: ${dayData.restHours}h rest`}
                  data-testid={`calendar-day-${dayData.day}`}
                >
                  <div className="font-semibold">{dayData.day}</div>
                  <div>{dayData.restHours}h</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading States */}
      {(crewLoading || restLoading) && (
        <Card>
          <CardContent className="flex items-center justify-center py-6">
            <div className="text-muted-foreground">Loading...</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}