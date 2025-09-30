import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Grid, Upload, Download, FileCheck, Palette } from 'lucide-react';

type DayRow = { date: string } & Record<`h${number}`, number>;

interface Crew {
  id: string;
  name: string;
  rank: string;
  vesselId?: string;
}

interface Vessel {
  id: string;
  name: string;
  type: string;
  orgId: string;
}

const MONTHS = [
  {label: "JANUARY", days: 31}, {label: "FEBRUARY", days: 29}, {label: "MARCH", days: 31},
  {label: "APRIL", days: 30}, {label: "MAY", days: 31}, {label: "JUNE", days: 30},
  {label: "JULY", days: 31}, {label: "AUGUST", days: 31}, {label: "SEPTEMBER", days: 30},
  {label: "OCTOBER", days: 31}, {label: "NOVEMBER", days: 30}, {label: "DECEMBER", days: 31}
];

function ymd(year: number, mIdx: number, d: number) {
  return new Date(Date.UTC(year, mIdx, d)).toISOString().slice(0, 10);
}

function emptyMonth(year: number, monthLabel: string): DayRow[] {
  const idx = MONTHS.findIndex(m => m.label === monthLabel);
  const days = idx === 1 ? ( // February leap check
    (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 29 : 28
  ) : MONTHS[idx].days;
  const rows: DayRow[] = [];
  for (let d = 1; d <= days; d++) {
    const row: any = { date: ymd(year, idx, d) };
    for (let h = 0; h < 24; h++) row[`h${h}`] = 0;
    rows.push(row as DayRow);
  }
  return rows;
}

function toCSV(rows: DayRow[]): string {
  if (!rows.length) return '';
  const header = ['date', ...Array.from({ length: 24 }, (_, i) => `h${i}`)];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push(header.map(k => String((r as any)[k] ?? '')).join(','));
  }
  return lines.join('\n');
}

function parseCSV(text: string): DayRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = lines[0].split(',').map(s => s.trim());
  const out: DayRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const col = lines[i].split(',');
    const row: any = {};
    header.forEach((h, j) => row[h] = j < col.length ? (h === 'date' ? col[j] : Number(col[j] || 0)) : (h === 'date' ? '' : 0));
    out.push(row as DayRow);
  }
  return out;
}

function sum24(r: DayRow) { 
  let s = 0; 
  for (let h = 0; h < 24; h++) s += (r as any)[`h${h}`] || 0; 
  return s; 
}

function chunks(r: DayRow): Array<[number, number]> {
  const segs: Array<[number, number]> = [];
  let cur = -1;
  for (let h = 0; h < 24; h++) {
    const v = (r as any)[`h${h}`] || 0;
    if (v === 1 && cur === -1) cur = h;
    if ((v === 0 || h === 23) && cur !== -1) {
      const end = (v === 0) ? h : 24;
      segs.push([cur, end]); 
      cur = -1;
    }
  }
  return segs;
}

function splitOK(r: DayRow) {
  const segs = chunks(r);
  const one6 = segs.some(([a, b]) => (b - a) >= 6);
  return segs.length <= 2 && one6;
}

function minRest24Around(idx: number, rows: DayRow[]) {
  // sliding windows ending at this day hour boundaries
  const flat: number[] = [];
  rows.forEach(r => { for (let h = 0; h < 24; h++) flat.push((r as any)[`h${h}`] || 0); });
  // check 24 windows that end within the civil day idx
  const base = idx * 24;
  let minv = 999;
  for (let k = 1; k <= 24; k++) {
    const start = Math.max(0, base + k - 24), end = base + k;
    const v = flat.slice(start, end).reduce((a, b) => a + b, 0);
    if (v < minv) minv = v;
  }
  return minv;
}

export function HoursOfRestGrid() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [meta, setMeta] = useState<any>({
    vessel_id: "all",
    crew_id: "",
    crew_name: "",
    rank: "Chief Eng",
    month: "AUGUST",
    year: new Date().getUTCFullYear()
  });
  
  const [rows, setRows] = useState<DayRow[]>(() => emptyMonth(new Date().getUTCFullYear(), "AUGUST"));
  const [csv, setCsv] = useState<string>('');
  const [result, setResult] = useState<any>(null);
  const [mode, setMode] = useState<'GRID' | 'CSV'>('GRID');
  const [paint, setPaint] = useState<0 | 1>(1); // click-paint value

  // Fetch crew members
  const { data: crew = [] } = useQuery<Crew[]>({
    queryKey: ['/api/crew'],
    refetchInterval: 30000
  });

  // Fetch vessels
  const { data: vessels = [] } = useQuery<Vessel[]>({
    queryKey: ['/api/vessels'],
    refetchInterval: 30000
  });

  // Filter crew by selected vessel
  const filteredCrew = useMemo(() => {
    if (!meta.vessel_id || meta.vessel_id === 'all') return crew;
    return crew.filter(c => c.vesselId === meta.vessel_id);
  }, [crew, meta.vessel_id]);

  // Vessel-first enforcement helpers
  const isVesselSelected = meta.vessel_id && meta.vessel_id !== 'all';
  const isCrewSelected = meta.crew_id && meta.crew_id !== '';
  const isReadyForActions = isVesselSelected && isCrewSelected;

  useEffect(() => {
    setRows(emptyMonth(meta.year, meta.month));
  }, [meta.year, meta.month]);

  // Update crew_id when crew is selected
  useEffect(() => {
    if (meta.crew_id && crew.length > 0) {
      const selectedCrew = crew.find(c => c.id === meta.crew_id);
      if (selectedCrew) {
        setMeta((prev: any) => ({
          ...prev,
          crew_name: selectedCrew.name,
          rank: selectedCrew.rank
        }));
      }
    }
  }, [meta.crew_id, crew]);

  // Auto-load saved rest data when crew member, month, or year changes
  useEffect(() => {
    async function loadSavedRestData() {
      if (!meta.crew_id || !meta.year || !meta.month) {
        return;
      }

      try {
        // Use month name directly - backend expects "AUGUST" not "08"
        const response = await fetch(`/api/stcw/rest/${meta.crew_id}/${meta.year}/${meta.month}`);
        
        if (response.status === 404) {
          // No saved data, use empty month
          setRows(emptyMonth(meta.year, meta.month));
          return;
        }
        
        if (!response.ok) {
          throw new Error('Failed to load rest data');
        }
        
        const data = await response.json();
        
        // Convert backend format to grid rows
        if (data.days && Array.isArray(data.days) && data.days.length > 0) {
          const loadedRows = emptyMonth(meta.year, meta.month);
          
          // Merge saved data into empty month
          data.days.forEach((day: any) => {
            // Trim the date string to handle any whitespace
            const trimmedDate = day.date.trim();
            const rowIndex = loadedRows.findIndex(r => r.date === trimmedDate);
            if (rowIndex !== -1) {
              const row: any = { date: trimmedDate };
              for (let h = 0; h < 24; h++) {
                row[`h${h}`] = day[`h${h}`] || 0;
              }
              loadedRows[rowIndex] = row as DayRow;
            }
          });
          
          setRows(loadedRows);
          toast({ 
            title: "Data loaded", 
            description: `Loaded saved rest data for ${meta.month} ${meta.year}` 
          });
        } else {
          setRows(emptyMonth(meta.year, meta.month));
        }
      } catch (error) {
        // Silently fall back to empty month if load fails
        console.error('Failed to load saved rest data:', error);
        setRows(emptyMonth(meta.year, meta.month));
      }
    }

    loadSavedRestData();
  }, [meta.crew_id, meta.year, meta.month]);

  const compliance = useMemo(() => {
    // quick per-day calc mirroring backend rules for color
    return rows.map((r, i) => ({
      date: r.date,
      restTotal: sum24(r),
      minRest24: minRest24Around(i, rows),
      splitOK: splitOK(r),
      dayOK: (minRest24Around(i, rows) >= 10) && splitOK(r)
    }));
  }, [rows]);

  function toggleCell(dIdx: number, h: number) {
    const next = rows.map((r, i) => i === dIdx ? { ...r, [`h${h}`]: ((r as any)[`h${h}`] === 1 ? 0 : 1) } as any : r);
    setRows(next);
  }

  function paintCell(dIdx: number, h: number) {
    const next = rows.map((r, i) => i === dIdx ? { ...r, [`h${h}`]: paint } as any : r);
    setRows(next);
  }

  function onDrag(e: React.MouseEvent, dIdx: number, h: number) {
    if (e.buttons !== 1) return; // left-click drag
    paintCell(dIdx, h);
  }

  function exportCSV() { 
    setCsv(toCSV(rows)); 
    setMode('CSV'); 
  }

  function importCSV() { 
    if (!csv.trim()) return; 
    const parsed = parseCSV(csv); 
    if (parsed.length) setRows(parsed); 
    setMode('GRID'); 
  }

  // Sample data generation function removed for production deployment

  function clearAll() { 
    setRows(rows.map(r => { 
      const x: any = { ...r }; 
      for (let h = 0; h < 24; h++) x[`h${h}`] = 0; 
      return x; 
    })); 
  }

  async function upload() {
    // Vessel-first enforcement: validate vessel and crew selection
    if (!isVesselSelected) {
      toast({ 
        title: "Vessel required", 
        description: "Please select a specific vessel before uploading data",
        variant: "destructive" 
      });
      return;
    }
    
    if (!isCrewSelected) {
      toast({ 
        title: "Crew member required", 
        description: "Please select a crew member before uploading data",
        variant: "destructive" 
      });
      return;
    }

    try {
      // Convert rows to CSV format
      const csvData = toCSV(rows);
      
      // Send as JSON body instead of FormData
      const response = await fetch('/api/stcw/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          csv: csvData,
          crewId: meta.crew_id,
          vessel: meta.vessel_id,
          year: meta.year,
          month: meta.month
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Upload failed');
      }

      // Handle response - check if it's JSON or text
      let result;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        // Handle text/plain or other response types
        const text = await response.text();
        result = { message: text || 'Upload successful', success: true };
      }

      setResult(result);
      toast({ title: "Upload successful", description: "Rest data uploaded successfully" });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/stcw/rest'] });
    } catch (error) {
      toast({ 
        title: "Upload failed", 
        description: error instanceof Error ? error.message : "Failed to upload rest data",
        variant: "destructive" 
      });
      setResult({ error: (error as Error).message });
    }
  }

  async function runCheck() {
    if (!meta.crew_id) {
      toast({ title: "Please select a crew member", variant: "destructive" });
      return;
    }

    try {
      // Use month name directly - backend expects "AUGUST" not "08"
      const response = await fetch(`/api/stcw/compliance/${meta.crew_id}/${meta.year}/${meta.month}`);
      
      if (!response.ok) {
        throw new Error('Compliance check failed');
      }

      const result = await response.json();
      setResult(result);
      toast({ 
        title: "Compliance check completed",
        description: `${result.compliant ? 'Compliant' : 'Violations found'}`
      });
    } catch (error) {
      toast({ title: "Compliance check failed", variant: "destructive" });
      setResult({ error: (error as Error).message });
    }
  }

  async function exportPdf() {
    if (!meta.crew_id) {
      toast({ title: "Please select a crew member", variant: "destructive" });
      return;
    }

    try {
      // Use month name directly - backend expects "AUGUST" not "08"
      const response = await fetch(`/api/stcw/export/${meta.crew_id}/${meta.year}/${meta.month}`);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stcw_rest_${meta.crew_id}_${meta.year}_${meta.month}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({ title: "PDF exported successfully" });
    } catch (error) {
      toast({ title: "Export failed", variant: "destructive" });
    }
  }

  function loadFromProposedPlan() {
    try {
      if (!meta.crew_id) {
        toast({ 
          title: "Please select a crew member", 
          description: "Select a crew member first before loading the proposed plan",
          variant: "destructive" 
        });
        return;
      }

      const storedPlan = localStorage.getItem('hor_proposed_rows');
      if (!storedPlan) {
        toast({ 
          title: "No proposed plan found", 
          description: "Generate a crew schedule first to create a proposed plan",
          variant: "destructive" 
        });
        return;
      }

      // Parse the stored plan - it's keyed by crew ID
      const proposedPlansByCrewId = JSON.parse(storedPlan);
      
      if (!proposedPlansByCrewId || typeof proposedPlansByCrewId !== 'object') {
        toast({ 
          title: "Invalid proposed plan", 
          description: "The stored plan data structure is invalid",
          variant: "destructive" 
        });
        return;
      }

      // Get the data for the selected crew
      const crewProposedRows = proposedPlansByCrewId[meta.crew_id];
      
      if (!crewProposedRows || !Array.isArray(crewProposedRows) || crewProposedRows.length === 0) {
        toast({ 
          title: "No data for selected crew", 
          description: `No proposed plan data found for the selected crew member`,
          variant: "destructive" 
        });
        return;
      }

      // Filter rows that match the current month/year
      const monthIndex = MONTHS.findIndex(m => m.label === meta.month);
      const currentYearMonth = `${meta.year}-${(monthIndex + 1).toString().padStart(2, '0')}`;
      
      const filteredRows = crewProposedRows.filter((row: DayRow) => 
        row.date && row.date.startsWith(currentYearMonth)
      );

      if (filteredRows.length === 0) {
        toast({ 
          title: "No matching data", 
          description: `No proposed plan data found for ${meta.month} ${meta.year}`,
          variant: "destructive" 
        });
        return;
      }

      // Merge with existing rows - preserve any existing data for days not in proposed plan
      const mergedRows = rows.map(existingRow => {
        const proposedRow = filteredRows.find((pr: DayRow) => pr.date === existingRow.date);
        return proposedRow || existingRow;
      });

      setRows(mergedRows);
      
      toast({ 
        title: "Proposed plan loaded", 
        description: `Loaded ${filteredRows.length} days of schedule data for selected crew` 
      });
    } catch (error) {
      console.error('Error loading proposed plan:', error);
      toast({ 
        title: "Loading failed", 
        description: "Failed to parse or load the proposed plan data",
        variant: "destructive" 
      });
    }
  }

  // Grid sizes
  const cell = 18, hourW = 24, hdrH = 26;
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center" data-testid="heading-hours-of-rest-grid">
          <Grid className="w-8 h-8 mr-3" />
          Hours of Rest (STCW) — Grid Editor
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Setup</CardTitle>
          <CardDescription>Select vessel and crew member to view or edit their hours of rest</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Step 1: Vessel Selection */}
            <div className="space-y-2">
              <Label htmlFor="vessel-select" className="text-base font-semibold flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-sm">1</span>
                Select Vessel
              </Label>
              <Select value={meta.vessel_id || 'all'} onValueChange={(value) => setMeta({...meta, vessel_id: value, crew_id: ''})}>
                <SelectTrigger data-testid="select-vessel-grid" className="h-11">
                  <SelectValue placeholder="Choose a vessel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" disabled>All Vessels (Please select a specific vessel)</SelectItem>
                  {vessels.map((vessel: Vessel) => (
                    <SelectItem key={vessel.id} value={vessel.id}>
                      {vessel.name} ({vessel.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!isVesselSelected && (
                <p className="text-sm text-amber-600 dark:text-amber-400 flex items-start gap-2">
                  <span className="text-lg">⚠️</span>
                  <span>Start by selecting a specific vessel to continue</span>
                </p>
              )}
            </div>

            {/* Step 2: Crew Selection */}
            <div className="space-y-2">
              <Label htmlFor="crew-select" className="text-base font-semibold flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-sm">2</span>
                Select Crew Member
              </Label>
              <Select 
                value={meta.crew_id} 
                onValueChange={(value) => setMeta({...meta, crew_id: value})}
                disabled={!isVesselSelected}
              >
                <SelectTrigger data-testid="select-crew-grid" className={`h-11 ${!isVesselSelected ? "opacity-50 cursor-not-allowed" : ""}`}>
                  <SelectValue placeholder={!isVesselSelected ? "Select vessel first" : "Choose a crew member"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredCrew.map((member: Crew) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name} - {member.rank}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!isVesselSelected && (
                <p className="text-sm text-muted-foreground">Crew selection will be available after choosing a vessel</p>
              )}
              {isVesselSelected && filteredCrew.length === 0 && (
                <p className="text-sm text-amber-600 dark:text-amber-400">No crew members found for this vessel</p>
              )}
            </div>

            {/* Step 3: Time Period */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-sm">3</span>
                Select Time Period
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-normal">Month</Label>
                  <Select value={meta.month} onValueChange={value => setMeta({...meta, month: value})}>
                    <SelectTrigger data-testid="select-month-grid">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map(m => (
                        <SelectItem key={m.label} value={m.label}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-normal">Year</Label>
                  <Input 
                    type="number" 
                    placeholder="Year" 
                    value={meta.year || 2025} 
                    onChange={e => setMeta({...meta, year: Number(e.target.value) || 2025})}
                    data-testid="input-year-grid"
                  />
                </div>
              </div>
            </div>

            {/* Status indicator */}
            {isReadyForActions && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                <p className="text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                  <span className="text-lg">✓</span>
                  <span>Ready to edit hours of rest for <strong>{crew.find(c => c.id === meta.crew_id)?.name}</strong> ({meta.month} {meta.year})</span>
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-slate-700 shadow-md">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-b">
          <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-200">Editing Tools</CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-400">Click cells to toggle, or use paint mode to drag and fill multiple cells</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Enhanced Paint Tool Section */}
            <div className="p-4 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800 dark:to-blue-950 rounded-lg border border-slate-200 dark:border-slate-600">
              <div className="flex items-start gap-3">
                <Palette className="w-5 h-5 text-slate-600 dark:text-slate-400 flex-shrink-0 mt-1" />
                <div className="flex-1 space-y-3">
                  <div>
                    <Label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Paint Mode
                    </Label>
                    <p className="text-xs text-muted-foreground">Select a mode below, then click and drag across cells to fill them quickly</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button 
                      onClick={() => setPaint(1)} 
                      variant={paint === 1 ? "default" : "outline"}
                      size="default"
                      className={`transition-all duration-200 ${paint === 1 
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md" 
                        : "border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-600 dark:hover:bg-emerald-950"
                      }`}
                      data-testid="button-paint-rest"
                    >
                      <span className="w-3 h-3 bg-emerald-400 rounded-full mr-2"></span>
                      Paint REST (Green)
                    </Button>
                    <Button 
                      onClick={() => setPaint(0)} 
                      variant={paint === 0 ? "default" : "outline"}
                      size="default"
                      className={`transition-all duration-200 ${paint === 0 
                        ? "bg-rose-600 hover:bg-rose-700 text-white shadow-md" 
                        : "border-rose-300 text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:border-rose-600 dark:hover:bg-rose-950"
                      }`}
                      data-testid="button-paint-work"
                    >
                      <span className="w-3 h-3 bg-rose-400 rounded-full mr-2"></span>
                      Paint WORK (Red)
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons - Organized by category */}
            <div className="space-y-4">
              {/* Primary Actions */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Save & Verify</Label>
                <div className="flex gap-2 flex-wrap">
                  <Button 
                    onClick={upload} 
                    size="default" 
                    disabled={!isReadyForActions}
                    className={`shadow-md transition-all duration-200 ${!isReadyForActions 
                      ? "opacity-50 cursor-not-allowed bg-gray-400 hover:bg-gray-400 text-gray-200"
                      : "bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg"
                    }`}
                    data-testid="button-upload-grid"
                    title={!isReadyForActions ? "Select vessel and crew member first" : "Save rest data to database"}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Save to Database
                  </Button>
                  <Button 
                    onClick={runCheck} 
                    variant="outline" 
                    size="default" 
                    disabled={!isReadyForActions}
                    className={`transition-all duration-200 ${!isReadyForActions 
                      ? "opacity-50 cursor-not-allowed border-gray-300 text-gray-500"
                      : "border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400 dark:text-amber-400 dark:border-amber-600 dark:hover:bg-amber-950"
                    }`}
                    data-testid="button-check-grid"
                    title={!isReadyForActions ? "Select vessel and crew member first" : "Check STCW compliance"}
                  >
                    <FileCheck className="w-4 h-4 mr-2" />
                    Check Compliance
                  </Button>
                </div>
              </div>

              {/* Import/Export & Utility Actions */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Data Management</Label>
                <div className="flex gap-2 flex-wrap">
                  <Button 
                    onClick={loadFromProposedPlan} 
                    variant="outline" 
                    size="sm" 
                    disabled={!isReadyForActions}
                    className={`transition-all duration-200 ${!isReadyForActions 
                      ? "opacity-50 cursor-not-allowed border-gray-300 text-gray-500"
                      : "border-indigo-300 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-400 dark:text-indigo-400 dark:border-indigo-600 dark:hover:bg-indigo-950"
                    }`}
                    data-testid="button-load-proposed-plan"
                    title={!isReadyForActions ? "Select vessel and crew member first" : "Load from crew schedule"}
                  >
                    <FileCheck className="w-4 h-4 mr-2" />
                    Load from Schedule
                  </Button>
                  <Button 
                    onClick={exportPdf} 
                    variant="outline" 
                    size="sm" 
                    className="border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-400 dark:text-purple-400 dark:border-purple-600 dark:hover:bg-purple-950 transition-all duration-200"
                    data-testid="button-export-pdf-grid"
                    title="Generate PDF report"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export PDF
                  </Button>
                  <Button 
                    onClick={exportCSV} 
                    variant="outline" 
                    size="sm" 
                    className="border-cyan-300 text-cyan-700 hover:bg-cyan-50 hover:border-cyan-400 dark:text-cyan-400 dark:border-cyan-600 dark:hover:bg-cyan-950 transition-all duration-200"
                    data-testid="button-export-csv"
                    title="Export to CSV file"
                  >
                    Export CSV
                  </Button>
                  <Button 
                    onClick={importCSV} 
                    variant="outline" 
                    size="sm" 
                    className="border-teal-300 text-teal-700 hover:bg-teal-50 hover:border-teal-400 dark:text-teal-400 dark:border-teal-600 dark:hover:bg-teal-950 transition-all duration-200"
                    data-testid="button-import-csv"
                    title="Import from CSV file"
                  >
                    Import CSV
                  </Button>
                  <Button 
                    onClick={clearAll} 
                    variant="outline" 
                    size="sm" 
                    className="border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 dark:text-slate-400 dark:border-slate-600 dark:hover:bg-slate-800 transition-all duration-200"
                    data-testid="button-clear-all"
                    title="Clear all hours in the grid"
                  >
                    Clear All
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced STCW Rules Info */}
          <div className="mt-6 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <FileCheck className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="font-medium text-slate-800 dark:text-slate-200 text-sm mb-1">STCW Maritime Compliance Rules</h4>
                <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  <li>• <span className="font-medium">Minimum 10 hours</span> rest in any 24-hour period</li>
                  <li>• <span className="font-medium">Minimum 77 hours</span> rest in any 7-day period</li>
                  <li>• <span className="font-medium">Maximum 2 rest blocks</span> per day with one ≥6 hours</li>
                  <li>• <span className="text-indigo-600 dark:text-indigo-400">Night hours (20:00-06:00)</span> have visual indicators</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Grid - Enhanced Visual Appeal */}
      <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-b">
          <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-200">Rest Hours Grid</CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-400">Click to toggle cells, drag to paint. <span className="inline-flex items-center gap-1"><span className="w-3 h-3 bg-emerald-200 dark:bg-emerald-800 rounded border"></span> REST</span> • <span className="inline-flex items-center gap-1"><span className="w-3 h-3 bg-rose-200 dark:bg-rose-800 rounded border"></span> WORK</span></CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-inner" data-testid="rest-hours-grid">
            {/* Enhanced Header Row */}
            <div className="sticky top-0 z-10" style={{ display: 'grid', gridTemplateColumns: `110px repeat(24, ${hourW}px) 75px 75px`, alignItems: 'center' }}>
              <div className="bg-slate-100 dark:bg-slate-800 border-r border-slate-300 dark:border-slate-600 px-3 py-2 font-medium text-slate-700 dark:text-slate-300">Date</div>
              {hours.map(h => (
                <div key={h} className="bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 border-r border-slate-300 dark:border-slate-600 text-center font-mono font-semibold text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700" style={{ height: hdrH + 6, lineHeight: `${hdrH + 6}px`, fontSize: 11 }}>
                  {String(h).padStart(2, '0')}
                </div>
              ))}
              <div className="bg-slate-100 dark:bg-slate-800 border-r border-slate-300 dark:border-slate-600 text-center font-medium text-slate-700 dark:text-slate-300 px-2 py-2 text-xs">Rest/24h</div>
              <div className="bg-slate-100 dark:bg-slate-800 text-center font-medium text-slate-700 dark:text-slate-300 px-2 py-2 text-xs">Min24h</div>
            </div>

            {/* Enhanced Day Rows */}
            {rows.map((r, ri) => {
              const c = compliance[ri];
              const dayOK = c?.dayOK;
              return (
                <div key={r.date} className="group hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors">
                  <div style={{ display: 'grid', gridTemplateColumns: `110px repeat(24, ${hourW}px) 75px 75px` }}>
                    {/* Enhanced Date Column */}
                    <div className="bg-slate-50 dark:bg-slate-800 border-r border-slate-300 dark:border-slate-600 px-3 py-2 flex items-center justify-center font-mono font-medium text-slate-700 dark:text-slate-300">
                      <span className="text-xs">{r.date.slice(8, 10)}</span>
                    </div>
                    
                    {/* Enhanced Hour Cells */}
                    {hours.map(h => {
                      const v = (r as any)[`h${h}`] || 0;
                      const isRest = v === 1;
                      const isNightHour = h >= 20 || h < 6; // Night hours for visual distinction
                      
                      return (
                        <div 
                          key={h}
                          onMouseDown={(e) => { e.preventDefault(); toggleCell(ri, h); }}
                          onMouseMove={(e) => onDrag(e, ri, h)}
                          className={`
                            border-r border-b border-slate-200 dark:border-slate-700 
                            cursor-crosshair transition-all duration-150 
                            hover:scale-105 hover:z-10 hover:shadow-md
                            ${isRest 
                              ? 'bg-emerald-100 dark:bg-emerald-900 hover:bg-emerald-200 dark:hover:bg-emerald-800' 
                              : 'bg-rose-100 dark:bg-rose-900 hover:bg-rose-200 dark:hover:bg-rose-800'
                            }
                            ${isNightHour ? 'ring-1 ring-inset ring-indigo-300 dark:ring-indigo-600' : ''}
                          `}
                          style={{ 
                            width: hourW, 
                            height: cell + 2,
                            position: 'relative'
                          }}
                          data-testid={`grid-cell-${ri}-${h}`}
                          title={`${isRest ? 'REST' : 'WORK'} at ${String(h).padStart(2, '0')}:00${isNightHour ? ' (Night)' : ''}`}
                        >
                          {/* Hour indicator for better visual feedback */}
                          {isRest && (
                            <div className="absolute inset-0 flex items-center justify-center opacity-20">
                              <div className="w-1 h-1 bg-emerald-600 dark:bg-emerald-400 rounded-full"></div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {/* Enhanced Compliance Indicators */}
                    <div className={`
                      border-r border-b border-slate-200 dark:border-slate-700 
                      text-center flex items-center justify-center font-mono font-semibold
                      ${c.restTotal >= 10 
                        ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' 
                        : 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                      }
                    `} style={{ fontSize: 11 }}>
                      {c.restTotal}
                    </div>
                    <div className={`
                      border-b border-slate-200 dark:border-slate-700 
                      text-center flex items-center justify-center font-mono font-semibold
                      ${c.minRest24 >= 10 
                        ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' 
                        : 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                      }
                    `} style={{ fontSize: 11 }}>
                      {c.minRest24.toFixed(0)}
                    </div>
                  </div>
                  
                  {/* Enhanced Compliance Status Bar */}
                  <div className={`
                    h-1 transition-all duration-300 
                    ${dayOK 
                      ? 'bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-sm' 
                      : 'bg-gradient-to-r from-rose-400 to-rose-600 shadow-sm'
                    }
                  `} style={{ marginBottom: 2 }}>
                    <div className={`h-full w-full ${dayOK ? 'animate-pulse' : ''}`}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* CSV panel */}
      {mode === 'CSV' && (
        <Card>
          <CardHeader>
            <CardTitle>CSV Data</CardTitle>
            <CardDescription>Edit raw CSV data (date,h0..h23)</CardDescription>
          </CardHeader>
          <CardContent>
            <textarea 
              className="w-full h-40 p-2 border rounded-md font-mono text-sm"
              value={csv} 
              onChange={e => setCsv(e.target.value)}
              data-testid="textarea-csv"
            />
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>API Response</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded-md overflow-auto" data-testid="text-api-result">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}