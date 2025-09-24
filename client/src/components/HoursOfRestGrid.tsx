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
    vessel_id: "GREEN BELAIT",
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

  function fillAllRest() { 
    setRows(rows.map(r => { 
      const x: any = { ...r }; 
      for (let h = 0; h < 24; h++) x[`h${h}`] = 1; 
      return x; 
    })); 
  }

  function clearAll() { 
    setRows(rows.map(r => { 
      const x: any = { ...r }; 
      for (let h = 0; h < 24; h++) x[`h${h}`] = 0; 
      return x; 
    })); 
  }

  async function upload() {
    if (!meta.crew_id) {
      toast({ title: "Please select a crew member", variant: "destructive" });
      return;
    }

    try {
      // Convert rows to CSV format for our existing API
      const csvData = toCSV(rows);
      const blob = new Blob([csvData], { type: 'text/csv' });
      const formData = new FormData();
      formData.append('file', blob, `rest_${meta.crew_id}_${meta.year}_${meta.month}.csv`);

      const response = await fetch('/api/stcw/import', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
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
      toast({ title: "Upload failed", description: "Failed to upload rest data", variant: "destructive" });
      setResult({ error: (error as Error).message });
    }
  }

  async function runCheck() {
    if (!meta.crew_id) {
      toast({ title: "Please select a crew member", variant: "destructive" });
      return;
    }

    try {
      const monthIndex = MONTHS.findIndex(m => m.label === meta.month) + 1;
      const monthString = monthIndex.toString().padStart(2, '0');
      
      const response = await fetch(`/api/stcw/compliance/${meta.crew_id}/${meta.year}/${monthString}`);
      
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
      const monthIndex = MONTHS.findIndex(m => m.label === meta.month) + 1;
      const monthString = monthIndex.toString().padStart(2, '0');
      
      const response = await fetch(`/api/stcw/export/${meta.crew_id}/${meta.year}/${monthString}`);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stcw_rest_${meta.crew_id}_${meta.year}_${monthString}.pdf`;
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
          <CardTitle>Crew & Vessel Information</CardTitle>
          <CardDescription>Configure crew member and time period for rest data editing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="crew-select">Crew Member</Label>
              <Select value={meta.crew_id} onValueChange={(value) => setMeta({...meta, crew_id: value})}>
                <SelectTrigger data-testid="select-crew-grid">
                  <SelectValue placeholder="Select crew member" />
                </SelectTrigger>
                <SelectContent>
                  {crew.map((member: Crew) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name} - {member.rank}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Vessel ID</Label>
              <Input 
                placeholder="Vessel" 
                value={meta.vessel_id || ''} 
                onChange={e => setMeta({...meta, vessel_id: e.target.value})}
                data-testid="input-vessel-id"
              />
            </div>

            <div className="space-y-2">
              <Label>Rank</Label>
              <Input 
                placeholder="Rank" 
                value={meta.rank || ''} 
                onChange={e => setMeta({...meta, rank: e.target.value})}
                data-testid="input-rank"
              />
            </div>

            <div className="space-y-2">
              <Label>Month</Label>
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
              <Label>Year</Label>
              <Input 
                type="number" 
                placeholder="Year" 
                value={meta.year || 2025} 
                onChange={e => setMeta({...meta, year: Number(e.target.value) || 2025})}
                data-testid="input-year-grid"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Grid Controls</CardTitle>
          <CardDescription>Paint tool and quick actions for rest data editing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 items-center flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="flex items-center gap-1">
                <Palette className="w-4 h-4" />
                Paint:
              </Label>
              <Button 
                onClick={() => setPaint(1)} 
                variant={paint === 1 ? "default" : "outline"}
                size="sm"
                className={paint === 1 ? "bg-green-600 hover:bg-green-700" : ""}
                data-testid="button-paint-rest"
              >
                REST
              </Button>
              <Button 
                onClick={() => setPaint(0)} 
                variant={paint === 0 ? "default" : "outline"}
                size="sm"
                className={paint === 0 ? "bg-red-600 hover:bg-red-700" : ""}
                data-testid="button-paint-work"
              >
                WORK
              </Button>
            </div>

            <div className="flex gap-2">
              <Button onClick={fillAllRest} variant="outline" size="sm" data-testid="button-fill-rest">
                Fill All REST
              </Button>
              <Button onClick={clearAll} variant="outline" size="sm" data-testid="button-clear-all">
                Clear All
              </Button>
            </div>

            <div className="flex gap-2">
              <Button onClick={upload} size="sm" data-testid="button-upload-grid">
                <Upload className="w-4 h-4 mr-1" />
                Upload
              </Button>
              <Button onClick={runCheck} variant="outline" size="sm" data-testid="button-check-grid">
                <FileCheck className="w-4 h-4 mr-1" />
                Check
              </Button>
              <Button onClick={exportPdf} variant="outline" size="sm" data-testid="button-export-pdf-grid">
                <Download className="w-4 h-4 mr-1" />
                Export PDF
              </Button>
              <Button onClick={loadFromProposedPlan} variant="outline" size="sm" data-testid="button-load-proposed-plan">
                <FileCheck className="w-4 h-4 mr-1" />
                Load from Proposed Plan
              </Button>
            </div>

            <div className="flex gap-2">
              <Button onClick={exportCSV} variant="outline" size="sm" data-testid="button-export-csv">
                Export CSV
              </Button>
              <Button onClick={importCSV} variant="outline" size="sm" data-testid="button-import-csv">
                Import CSV → Grid
              </Button>
            </div>
          </div>

          <div className="mt-4 text-xs text-muted-foreground">
            <strong>STCW Rules:</strong> ≥10h rest/24h, ≥77h rest/7d, ≤2 rest blocks/day with one ≥6h
          </div>
        </CardContent>
      </Card>

      {/* Interactive Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Rest Hours Grid</CardTitle>
          <CardDescription>Click to toggle cells, drag to paint. Green = REST, Red = WORK</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto" data-testid="rest-hours-grid">
            <div style={{ display: 'grid', gridTemplateColumns: `100px repeat(24, ${hourW}px) 70px 70px`, alignItems: 'center' }}>
              <div></div>
              {hours.map(h => (
                <div key={h} style={{ textAlign: 'center', height: hdrH, lineHeight: `${hdrH}px`, fontSize: 12, background: '#f1f5f9' }}>
                  {String(h).padStart(2, '0')}
                </div>
              ))}
              <div style={{ textAlign: 'center', background: '#f1f5f9', fontSize: 12 }}>Rest/24</div>
              <div style={{ textAlign: 'center', background: '#f1f5f9', fontSize: 12 }}>Min24</div>
            </div>

            {/* Day rows */}
            {rows.map((r, ri) => {
              const c = compliance[ri];
              const dayOK = c?.dayOK;
              return (
                <div key={r.date}>
                  <div style={{ display: 'grid', gridTemplateColumns: `100px repeat(24, ${hourW}px) 70px 70px` }}>
                    <div style={{ fontSize: 12, padding: '2px 4px', background: '#fff' }}>
                      {r.date.slice(-2)}
                    </div>
                    {hours.map(h => {
                      const v = (r as any)[`h${h}`] || 0;
                      const bg = v === 1 ? '#dcfce7' : '#fee2e2';
                      return (
                        <div 
                          key={h}
                          onMouseDown={(e) => { e.preventDefault(); toggleCell(ri, h); }}
                          onMouseMove={(e) => onDrag(e, ri, h)}
                          style={{ 
                            width: hourW, 
                            height: cell, 
                            background: bg, 
                            border: '1px solid #e2e8f0', 
                            cursor: 'crosshair' 
                          }}
                          data-testid={`grid-cell-${ri}-${h}`}
                        />
                      );
                    })}
                    <div style={{ textAlign: 'center', fontSize: 12, background: c.restTotal >= 10 ? '#e2e8f0' : '#ffe4e6' }}>
                      {c.restTotal}
                    </div>
                    <div style={{ textAlign: 'center', fontSize: 12, background: c.minRest24 >= 10 ? '#e2e8f0' : '#ffe4e6' }}>
                      {c.minRest24.toFixed(0)}
                    </div>
                  </div>
                  {/* Day OK stripe */}
                  <div style={{ height: 2, background: dayOK ? '#10b981' : '#ef4444', marginBottom: 1 }}></div>
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