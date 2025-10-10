import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Grid, Upload, Download, FileCheck, Palette, Undo, Redo, Save, Clock, Calendar, ChevronLeft, ChevronRight, Copy, AlertTriangle, TrendingUp, ListChecks, ChevronDown, ChevronUp, Smartphone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

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

interface ShiftPattern {
  id: string;
  name: string;
  description: string;
  pattern: number[]; // 24 hour array
}

const MONTHS = [
  {label: "JANUARY", days: 31}, {label: "FEBRUARY", days: 29}, {label: "MARCH", days: 31},
  {label: "APRIL", days: 30}, {label: "MAY", days: 31}, {label: "JUNE", days: 30},
  {label: "JULY", days: 31}, {label: "AUGUST", days: 31}, {label: "SEPTEMBER", days: 30},
  {label: "OCTOBER", days: 31}, {label: "NOVEMBER", days: 30}, {label: "DECEMBER", days: 31}
];

const DEFAULT_PATTERNS: ShiftPattern[] = [
  {
    id: 'watch-4-8',
    name: '4-8 Watch Rotation',
    description: '4 hours on, 8 hours off',
    pattern: [1,1,1,1,0,0,0,0,1,1,1,1,0,0,0,0,1,1,1,1,0,0,0,0]
  },
  {
    id: 'watch-6-6',
    name: '6-6 Split Shift',
    description: '6 hours work, 6 hours rest',
    pattern: [0,0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,0,1,1,1,1,1,1]
  },
  {
    id: 'night-watch',
    name: 'Night Watch',
    description: 'Work 20:00-04:00',
    pattern: [0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0]
  },
  {
    id: 'day-shift',
    name: 'Day Shift',
    description: 'Work 08:00-18:00, rest otherwise',
    pattern: [1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1]
  }
];

function ymd(year: number, mIdx: number, d: number) {
  return new Date(Date.UTC(year, mIdx, d)).toISOString().slice(0, 10);
}

function emptyMonth(year: number, monthLabel: string): DayRow[] {
  const idx = MONTHS.findIndex(m => m.label === monthLabel);
  const days = idx === 1 ? ( 
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
  const flat: number[] = [];
  rows.forEach(r => { for (let h = 0; h < 24; h++) flat.push((r as any)[`h${h}`] || 0); });
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
  
  // NEW: Undo/Redo state
  const [history, setHistory] = useState<DayRow[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const historyRef = useRef<DayRow[][]>([]);
  const historyIndexRef = useRef(-1);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  
  // NEW: UI state
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'mobile'>('month');
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [liveCheck, setLiveCheck] = useState(true);
  const [selectedRange, setSelectedRange] = useState<number[]>([]);
  const [customPatterns, setCustomPatterns] = useState<ShiftPattern[]>([]);
  const [showQuickEdit, setShowQuickEdit] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [showSummary, setShowSummary] = useState(true);
  
  // Custom rest schedule state
  const [customRestStart, setCustomRestStart] = useState("20:00");
  const [customRestEnd, setCustomRestEnd] = useState("06:00");
  const [monthsToCopy, setMonthsToCopy] = useState<string[]>([]);
  const [monthsToRemove, setMonthsToRemove] = useState<string[]>([]);
  
  // Drag state for area selection
  const [isDragging, setIsDragging] = useState(false);
  const paintValueRef = useRef<number | null>(null);
  const dragStartRef = useRef<DayRow[]>([]);
  const dragStartPosRef = useRef<{ row: number; col: number } | null>(null);
  const dragEndPosRef = useRef<{ row: number; col: number } | null>(null);
  const currentRowsRef = useRef<DayRow[]>(rows);
  
  // Keep refs updated
  useEffect(() => {
    currentRowsRef.current = rows;
  }, [rows]);
  
  useEffect(() => {
    historyRef.current = history;
  }, [history]);
  
  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  const { data: crew = [] } = useQuery<Crew[]>({
    queryKey: ['/api/crew'],
    refetchInterval: 30000
  });

  const { data: vessels = [] } = useQuery<Vessel[]>({
    queryKey: ['/api/vessels'],
    refetchInterval: 30000
  });

  const filteredCrew = useMemo(() => {
    if (!meta.vessel_id || meta.vessel_id === 'all') return crew;
    return crew.filter(c => c.vesselId === meta.vessel_id);
  }, [crew, meta.vessel_id]);

  const isVesselSelected = meta.vessel_id && meta.vessel_id !== 'all';
  const isCrewSelected = meta.crew_id && meta.crew_id !== '';
  const isReadyForActions = isVesselSelected && isCrewSelected;

  // NEW: Add to history for undo/redo
  const addToHistory = useCallback((newRows: DayRow[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      return [...newHistory, JSON.parse(JSON.stringify(newRows))].slice(-20); // Keep last 20
    });
    setHistoryIndex(prev => Math.min(prev + 1, 19));
    setSaveStatus('unsaved');
  }, [historyIndex]);

  // NEW: Undo/Redo functions - use refs to avoid stale closures
  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      const newIndex = historyIndexRef.current - 1;
      setHistoryIndex(newIndex);
      setRows(JSON.parse(JSON.stringify(historyRef.current[newIndex])));
    }
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      const newIndex = historyIndexRef.current + 1;
      setHistoryIndex(newIndex);
      setRows(JSON.parse(JSON.stringify(historyRef.current[newIndex])));
    }
  }, []);

  // NEW: Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          undo();
        } else if (e.key === 'y' || (e.shiftKey && e.key === 'z')) {
          e.preventDefault();
          redo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // NEW: Auto-save functionality
  useEffect(() => {
    if (saveStatus === 'unsaved' && isReadyForActions) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        autoSave();
      }, 5000); // Auto-save after 5 seconds of inactivity
    }
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [saveStatus, isReadyForActions, rows]);

  const autoSave = async () => {
    if (!isReadyForActions) return;
    setSaveStatus('saving');
    try {
      const csvData = toCSV(rows);
      const response = await fetch('/api/stcw/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csv: csvData,
          crewId: meta.crew_id,
          vessel: meta.vessel_id,
          year: meta.year,
          month: meta.month
        })
      });
      if (response.ok) {
        setSaveStatus('saved');
      } else {
        setSaveStatus('unsaved');
      }
    } catch {
      setSaveStatus('unsaved');
    }
  };

  useEffect(() => {
    const emptyRows = emptyMonth(meta.year, meta.month);
    setRows(emptyRows);
    setHistory([JSON.parse(JSON.stringify(emptyRows))]);
    setHistoryIndex(0);
  }, [meta.year, meta.month]);

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

  useEffect(() => {
    async function loadSavedRestData() {
      if (!meta.crew_id || !meta.year || !meta.month) return;
      try {
        const response = await fetch(`/api/stcw/rest/${meta.crew_id}/${meta.year}/${meta.month}`);
        if (response.status === 404) {
          const emptyRows = emptyMonth(meta.year, meta.month);
          setRows(emptyRows);
          setHistory([JSON.parse(JSON.stringify(emptyRows))]);
          setHistoryIndex(0);
          return;
        }
        if (!response.ok) throw new Error('Failed to load rest data');
        const data = await response.json();
        if (data.days && Array.isArray(data.days) && data.days.length > 0) {
          const loadedRows = emptyMonth(meta.year, meta.month);
          data.days.forEach((day: any) => {
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
          setHistory([JSON.parse(JSON.stringify(loadedRows))]);
          setHistoryIndex(0);
          setSaveStatus('saved');
        } else {
          const emptyRows = emptyMonth(meta.year, meta.month);
          setRows(emptyRows);
          setHistory([JSON.parse(JSON.stringify(emptyRows))]);
          setHistoryIndex(0);
        }
      } catch (error) {
        console.error('Failed to load saved rest data:', error);
        const emptyRows = emptyMonth(meta.year, meta.month);
        setRows(emptyRows);
        setHistory([JSON.parse(JSON.stringify(emptyRows))]);
        setHistoryIndex(0);
      }
    }
    loadSavedRestData();
  }, [meta.crew_id, meta.year, meta.month]);

  const compliance = useMemo(() => {
    return rows.map((r, i) => ({
      date: r.date,
      restTotal: sum24(r),
      minRest24: minRest24Around(i, rows),
      splitOK: splitOK(r),
      dayOK: (minRest24Around(i, rows) >= 10) && splitOK(r)
    }));
  }, [rows]);

  // NEW: Summary statistics
  const summaryStats = useMemo(() => {
    const compliantDays = compliance.filter(c => c.dayOK).length;
    const totalDays = rows.length;
    const violations = compliance.filter(c => !c.dayOK);
    const avgRest = compliance.reduce((sum, c) => sum + c.restTotal, 0) / totalDays;
    const totalRest = compliance.reduce((sum, c) => sum + c.restTotal, 0);
    
    // Find longest work period
    let longestWork = 0;
    rows.forEach(r => {
      const workChunks = chunks(r).filter(([a, b]) => {
        const hours = Array.from({ length: b - a }, (_, i) => (r as any)[`h${a + i}`]);
        return hours.some(h => h === 0); // Work periods
      });
      workChunks.forEach(([a, b]) => {
        if (b - a > longestWork) longestWork = b - a;
      });
    });

    return {
      compliantDays,
      totalDays,
      complianceRate: (compliantDays / totalDays * 100).toFixed(1),
      violations: violations.length,
      avgRest: avgRest.toFixed(1),
      totalRest,
      longestWork,
      criticalViolations: violations.filter(v => v.minRest24 < 8).length
    };
  }, [compliance, rows]);

  function startDrag(dIdx: number, h: number) {
    // Save starting state and position for rectangular selection
    dragStartRef.current = JSON.parse(JSON.stringify(rows));
    dragStartPosRef.current = { row: dIdx, col: h };
    
    const currentValue = (rows[dIdx] as any)[`h${h}`] || 0;
    const newValue = currentValue === 1 ? 0 : 1;
    
    // Set the paint value for this drag
    paintValueRef.current = newValue;
    setIsDragging(true);
    
    // Paint initial cell for single click
    const next = dragStartRef.current.map((r, rowIdx) => {
      if (rowIdx === dIdx) {
        return { ...r, [`h${h}`]: newValue };
      }
      return r;
    });
    
    setRows(next);
  }

  function onDrag(dIdx: number, h: number) {
    // Paint rectangular area from start to current position
    if (paintValueRef.current === null || !dragStartPosRef.current) return;
    
    // Update the current end position
    dragEndPosRef.current = { row: dIdx, col: h };
    
    // Calculate rectangular bounds
    const startPos = dragStartPosRef.current;
    const minRow = Math.min(startPos.row, dIdx);
    const maxRow = Math.max(startPos.row, dIdx);
    const minCol = Math.min(startPos.col, h);
    const maxCol = Math.max(startPos.col, h);
    
    // Paint only cells within the rectangle from clean snapshot
    const next = dragStartRef.current.map((r, rowIdx) => {
      const updated = { ...r } as any;
      
      // Only paint if this row is in the rectangle
      if (rowIdx >= minRow && rowIdx <= maxRow) {
        // Paint only the hours in the column range
        for (let hour = minCol; hour <= maxCol; hour++) {
          updated[`h${hour}`] = paintValueRef.current;
        }
      }
      
      return updated;
    });
    
    setRows(next);
  }

  function endDrag() {
    // Painting is done live in onDrag, just need to add to history
    if (paintValueRef.current !== null && dragStartRef.current.length > 0) {
      // Check if anything changed using current rows ref
      const hasChanged = JSON.stringify(dragStartRef.current) !== JSON.stringify(currentRowsRef.current);
      if (hasChanged) {
        addToHistory(currentRowsRef.current);
      }
    }
    
    setIsDragging(false);
    paintValueRef.current = null;
    dragStartRef.current = [];
    dragStartPosRef.current = null;
    dragEndPosRef.current = null;
  }

  // Handle mouseup globally to end drag
  useEffect(() => {
    const handleMouseUp = () => {
      endDrag();
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [addToHistory]);

  function exportCSV() { 
    setCsv(toCSV(rows)); 
    setMode('CSV'); 
  }

  function importCSV() { 
    if (!csv.trim()) return; 
    const parsed = parseCSV(csv); 
    if (parsed.length) {
      setRows(parsed);
      addToHistory(parsed);
    }
    setMode('GRID'); 
  }

  function clearAll() { 
    const cleared = rows.map(r => { 
      const x: any = { ...r }; 
      for (let h = 0; h < 24; h++) x[`h${h}`] = 0; 
      return x; 
    });
    setRows(cleared);
    addToHistory(cleared);
  }

  // NEW: Apply shift pattern
  const applyPattern = (patternId: string, dayIndices: number[]) => {
    const pattern = [...DEFAULT_PATTERNS, ...customPatterns].find(p => p.id === patternId);
    if (!pattern) return;

    const next = rows.map((r, i) => {
      if (dayIndices.includes(i)) {
        const newRow: any = { date: r.date };
        for (let h = 0; h < 24; h++) {
          newRow[`h${h}`] = pattern.pattern[h];
        }
        return newRow as DayRow;
      }
      return r;
    });
    setRows(next);
    addToHistory(next);
    toast({ title: "Pattern applied", description: `Applied ${pattern.name} to ${dayIndices.length} days` });
  };

  // NEW: Batch operations
  const applyToWeekdays = (patternId: string) => {
    const weekdayIndices = rows.map((r, i) => {
      const date = new Date(r.date);
      const day = date.getDay();
      return (day >= 1 && day <= 5) ? i : -1;
    }).filter(i => i !== -1);
    applyPattern(patternId, weekdayIndices);
  };

  const applyToWeekends = (patternId: string) => {
    const weekendIndices = rows.map((r, i) => {
      const date = new Date(r.date);
      const day = date.getDay();
      return (day === 0 || day === 6) ? i : -1;
    }).filter(i => i !== -1);
    applyPattern(patternId, weekendIndices);
  };

  const copyWeek = (sourceWeek: number, targetWeeks: number[]) => {
    const startIdx = sourceWeek * 7;
    const endIdx = Math.min(startIdx + 7, rows.length);
    const weekData = rows.slice(startIdx, endIdx);
    
    const next = [...rows];
    targetWeeks.forEach(weekNum => {
      const targetStart = weekNum * 7;
      weekData.forEach((day, offset) => {
        if (targetStart + offset < next.length) {
          next[targetStart + offset] = { ...day, date: next[targetStart + offset].date };
        }
      });
    });
    setRows(next);
    addToHistory(next);
    toast({ title: "Week copied", description: `Copied week ${sourceWeek + 1} to ${targetWeeks.length} other week(s)` });
  };

  // Custom rest schedule functions
  const timeToHourPattern = (startTime: string, endTime: string): number[] => {
    const pattern = new Array(24).fill(0); // 0 = work, 1 = rest
    
    if (!startTime || !endTime) return pattern;
    
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const start = startHour;
    const end = endHour;
    
    // Handle time ranges that cross midnight
    if (end <= start) {
      // Rest period crosses midnight (e.g., 20:00 to 06:00)
      for (let h = start; h < 24; h++) {
        pattern[h] = 1; // Rest
      }
      for (let h = 0; h < end; h++) {
        pattern[h] = 1; // Rest
      }
    } else {
      // Normal time range (e.g., 08:00 to 18:00)
      for (let h = start; h < end; h++) {
        pattern[h] = 1; // Rest
      }
    }
    
    return pattern;
  };

  const applyCustomRestToAllDays = () => {
    const pattern = timeToHourPattern(customRestStart, customRestEnd);
    
    const next = rows.map(r => {
      const newRow: any = { date: r.date };
      for (let h = 0; h < 24; h++) {
        newRow[`h${h}`] = pattern[h];
      }
      return newRow as DayRow;
    });
    
    setRows(next);
    addToHistory(next);
    toast({ 
      title: "Rest period applied", 
      description: `Applied ${customRestStart} to ${customRestEnd} rest period to all days of ${meta.month}` 
    });
  };

  const copyMonthToYear = async () => {
    if (monthsToCopy.length === 0) {
      toast({ title: "No months selected", description: "Please select at least one month to copy to", variant: "destructive" });
      return;
    }

    if (!isReadyForActions) {
      toast({ title: "Selection required", description: "Please select vessel and crew first", variant: "destructive" });
      return;
    }

    try {
      let successCount = 0;
      
      console.log('[CopyMonthToYear] Starting copy operation', {
        sourceMonth: meta.month,
        year: meta.year,
        targetMonths: monthsToCopy,
        currentRowsCount: rows.length
      });
      
      for (const targetMonth of monthsToCopy) {
        // Skip if trying to copy to the same month
        if (targetMonth === meta.month) {
          console.log('[CopyMonthToYear] Skipping same month:', targetMonth);
          continue;
        }
        
        // Create new month data with correct dates for target month
        const targetMonthRows = emptyMonth(meta.year, targetMonth);
        console.log('[CopyMonthToYear] Created target month rows', {
          targetMonth,
          rowCount: targetMonthRows.length,
          firstDate: targetMonthRows[0]?.date,
          lastDate: targetMonthRows[targetMonthRows.length - 1]?.date
        });
        
        // Apply the same hour pattern from current month to target month
        const copiedRows = targetMonthRows.map((targetRow, idx) => {
          // If we have a corresponding row in the current month, copy its pattern
          if (idx < rows.length) {
            const sourceRow = rows[idx];
            const newRow: any = { date: targetRow.date };
            for (let h = 0; h < 24; h++) {
              newRow[`h${h}`] = sourceRow[`h${h}` as keyof DayRow] || 0;
            }
            return newRow as DayRow;
          }
          return targetRow;
        });
        
        // Log sample row for debugging
        console.log('[CopyMonthToYear] Sample copied row', {
          targetMonth,
          firstRow: {
            date: copiedRows[0]?.date,
            h0: copiedRows[0]?.h0,
            h22: copiedRows[0]?.h22,
            h23: copiedRows[0]?.h23,
            h7: copiedRows[0]?.h7
          },
          sourceRow: {
            date: rows[0]?.date,
            h0: rows[0]?.h0,
            h22: rows[0]?.h22,
            h23: rows[0]?.h23,
            h7: rows[0]?.h7
          }
        });
        
        const targetCsv = toCSV(copiedRows);
        console.log('[CopyMonthToYear] Generated CSV', {
          targetMonth,
          csvLength: targetCsv.length,
          csvPreview: targetCsv.substring(0, 200)
        });
        
        const response = await fetch('/api/stcw/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            csv: targetCsv,
            crewId: meta.crew_id,
            vessel: meta.vessel_id,
            year: meta.year,
            month: targetMonth
          })
        });

        const responseData = await response.json().catch(() => null);
        console.log('[CopyMonthToYear] API response', {
          targetMonth,
          status: response.status,
          ok: response.ok,
          data: responseData
        });

        if (response.ok) {
          successCount++;
        }
      }

      toast({ 
        title: "Month data copied", 
        description: `Successfully copied ${meta.month} schedule to ${successCount} month(s)` 
      });
      setMonthsToCopy([]);
    } catch (error) {
      console.error('[CopyMonthToYear] Error:', error);
      toast({ title: "Copy failed", description: "Failed to copy month data", variant: "destructive" });
    }
  };

  const removeMonths = async () => {
    if (monthsToRemove.length === 0) {
      toast({ title: "No months selected", description: "Please select at least one month to clear", variant: "destructive" });
      return;
    }

    if (!isReadyForActions) {
      toast({ title: "Selection required", description: "Please select vessel and crew first", variant: "destructive" });
      return;
    }

    try {
      // Create empty month data (all zeros)
      const emptyRow: DayRow[] = emptyMonth(meta.year, monthsToRemove[0]);
      const emptyCsv = toCSV(emptyRow);
      let successCount = 0;

      for (const targetMonth of monthsToRemove) {
        const emptyMonthData = emptyMonth(meta.year, targetMonth);
        const monthCsv = toCSV(emptyMonthData);
        
        const response = await fetch('/api/stcw/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            csv: monthCsv,
            crewId: meta.crew_id,
            vessel: meta.vessel_id,
            year: meta.year,
            month: targetMonth
          })
        });

        if (response.ok) {
          successCount++;
        }
      }

      toast({ 
        title: "Month data cleared", 
        description: `Successfully cleared ${successCount} month(s)`,
        variant: "default"
      });
      setMonthsToRemove([]);
    } catch (error) {
      toast({ title: "Clear failed", description: "Failed to clear month data", variant: "destructive" });
    }
  };

  async function upload() {
    if (!isVesselSelected) {
      toast({ title: "Vessel required", description: "Please select a specific vessel before uploading data", variant: "destructive" });
      return;
    }
    if (!isCrewSelected) {
      toast({ title: "Crew member required", description: "Please select a crew member before uploading data", variant: "destructive" });
      return;
    }
    setSaveStatus('saving');
    try {
      const csvData = toCSV(rows);
      const response = await fetch('/api/stcw/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      let result;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        const text = await response.text();
        result = { message: text || 'Upload successful', success: true };
      }

      setResult(result);
      setSaveStatus('saved');
      toast({ title: "Saved successfully", description: "Rest data saved to database" });
      queryClient.invalidateQueries({ queryKey: ['/api/stcw/rest'] });
    } catch (error) {
      setSaveStatus('unsaved');
      toast({ title: "Save failed", description: error instanceof Error ? error.message : "Failed to save rest data", variant: "destructive" });
      setResult({ error: (error as Error).message });
    }
  }

  async function runCheck() {
    if (!meta.crew_id) {
      toast({ title: "Please select a crew member", variant: "destructive" });
      return;
    }
    try {
      const response = await fetch(`/api/stcw/compliance/${meta.crew_id}/${meta.year}/${meta.month}`);
      if (!response.ok) throw new Error('Compliance check failed');
      const result = await response.json();
      setResult(result);
      toast({ title: "Compliance check completed", description: `${result.compliant ? 'Compliant' : 'Violations found'}` });
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
      const response = await fetch(`/api/stcw/export/${meta.crew_id}/${meta.year}/${meta.month}`);
      if (!response.ok) throw new Error('Export failed');
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
        toast({ title: "Please select a crew member", description: "Select a crew member first before loading the proposed plan", variant: "destructive" });
        return;
      }
      const storedPlan = localStorage.getItem('hor_proposed_rows');
      if (!storedPlan) {
        toast({ title: "No proposed plan found", description: "Generate a crew schedule first to create a proposed plan", variant: "destructive" });
        return;
      }
      const proposedPlansByCrewId = JSON.parse(storedPlan);
      if (!proposedPlansByCrewId || typeof proposedPlansByCrewId !== 'object') {
        toast({ title: "Invalid proposed plan", description: "The stored plan data structure is invalid", variant: "destructive" });
        return;
      }
      const crewProposedRows = proposedPlansByCrewId[meta.crew_id];
      if (!crewProposedRows || !Array.isArray(crewProposedRows) || crewProposedRows.length === 0) {
        toast({ title: "No data for selected crew", description: `No proposed plan data found for the selected crew member`, variant: "destructive" });
        return;
      }
      const monthIndex = MONTHS.findIndex(m => m.label === meta.month);
      const currentYearMonth = `${meta.year}-${(monthIndex + 1).toString().padStart(2, '0')}`;
      const filteredRows = crewProposedRows.filter((row: DayRow) => 
        row.date && row.date.startsWith(currentYearMonth)
      );
      if (filteredRows.length === 0) {
        toast({ title: "No matching data", description: `No proposed plan data found for ${meta.month} ${meta.year}`, variant: "destructive" });
        return;
      }
      const mergedRows = rows.map(existingRow => {
        const proposedRow = filteredRows.find((pr: DayRow) => pr.date === existingRow.date);
        return proposedRow || existingRow;
      });
      setRows(mergedRows);
      addToHistory(mergedRows);
      toast({ title: "Proposed plan loaded", description: `Loaded ${filteredRows.length} days of schedule data for selected crew` });
    } catch (error) {
      console.error('Error loading proposed plan:', error);
      toast({ title: "Loading failed", description: "Failed to parse or load the proposed plan data", variant: "destructive" });
    }
  }

  // NEW: Week view data
  const weekData = useMemo(() => {
    if (viewMode !== 'week') return rows;
    const start = weekOffset * 7;
    return rows.slice(start, start + 7);
  }, [rows, weekOffset, viewMode]);

  const displayRows = viewMode === 'week' ? weekData : rows;

  const cell = 18, hourW = 24, hdrH = 26;
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center" data-testid="heading-hours-of-rest-grid">
          <Grid className="w-8 h-8 mr-3" />
          Hours of Rest (STCW) — Enhanced Editor
        </h1>
        
        {/* Save status indicator */}
        <div className="flex items-center gap-2">
          {saveStatus === 'saved' && (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              <Save className="w-3 h-3 mr-1" />
              Saved
            </Badge>
          )}
          {saveStatus === 'saving' && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              <Clock className="w-3 h-3 mr-1 animate-spin" />
              Saving...
            </Badge>
          )}
          {saveStatus === 'unsaved' && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Unsaved changes
            </Badge>
          )}
        </div>
      </div>

      {/* Vessel & Crew Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Setup</CardTitle>
          <CardDescription>Select vessel and crew member to view or edit their hours of rest</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
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

      {/* NEW: Summary Dashboard */}
      {showSummary && isReadyForActions && (
        <Card className="border-2 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <CardTitle>Compliance Summary</CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowSummary(false)}>
                <ChevronUp className="w-4 h-4" />
              </Button>
            </div>
            <CardDescription>Month overview and compliance statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 rounded-lg">
                <p className="text-sm text-muted-foreground">Compliance Rate</p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{summaryStats.complianceRate}%</p>
                <Progress value={parseFloat(summaryStats.complianceRate)} className="mt-2 h-2" />
                <p className="text-xs text-muted-foreground mt-1">{summaryStats.compliantDays}/{summaryStats.totalDays} days</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-lg">
                <p className="text-sm text-muted-foreground">Avg Rest/Day</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{summaryStats.avgRest}h</p>
                <p className="text-xs text-muted-foreground mt-1">Total: {summaryStats.totalRest}h this month</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 rounded-lg">
                <p className="text-sm text-muted-foreground">Violations</p>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{summaryStats.violations}</p>
                <p className="text-xs text-muted-foreground mt-1">{summaryStats.criticalViolations} critical (&lt;8h)</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-lg">
                <p className="text-sm text-muted-foreground">Longest Work</p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{summaryStats.longestWork}h</p>
                <p className="text-xs text-muted-foreground mt-1">Continuous period</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {!showSummary && isReadyForActions && (
        <Button variant="outline" size="sm" onClick={() => setShowSummary(true)} className="w-full">
          <ChevronDown className="w-4 h-4 mr-2" />
          Show Summary Dashboard
        </Button>
      )}

      {/* NEW: View Mode Toggle & Undo/Redo */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle>View & Edit Controls</CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 border rounded-md p-1">
                <Button 
                  variant={viewMode === 'month' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => setViewMode('month')}
                  data-testid="button-view-month"
                >
                  <Calendar className="w-4 h-4 mr-1" />
                  Month
                </Button>
                <Button 
                  variant={viewMode === 'week' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => { setViewMode('week'); setWeekOffset(0); }}
                  data-testid="button-view-week"
                >
                  <ListChecks className="w-4 h-4 mr-1" />
                  Week
                </Button>
                <Button 
                  variant={viewMode === 'mobile' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => setViewMode('mobile')}
                  data-testid="button-view-mobile"
                >
                  <Smartphone className="w-4 h-4 mr-1" />
                  Mobile
                </Button>
              </div>
              <div className="flex items-center gap-1">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={undo}
                  disabled={historyIndex <= 0}
                  title="Undo (Ctrl+Z)"
                  data-testid="button-undo"
                >
                  <Undo className="w-4 h-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={redo}
                  disabled={historyIndex >= history.length - 1}
                  title="Redo (Ctrl+Y)"
                  data-testid="button-redo"
                >
                  <Redo className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'week' && (
            <div className="flex items-center justify-between mb-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
                disabled={weekOffset === 0}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous Week
              </Button>
              <span className="font-medium">Week {weekOffset + 1} of {Math.ceil(rows.length / 7)}</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setWeekOffset(Math.min(Math.floor(rows.length / 7), weekOffset + 1))}
                disabled={weekOffset >= Math.floor(rows.length / 7)}
              >
                Next Week
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch 
                id="live-check" 
                checked={liveCheck} 
                onCheckedChange={setLiveCheck}
              />
              <Label htmlFor="live-check" className="text-sm">Live compliance check</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom Rest Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Custom Rest Schedule
          </CardTitle>
          <CardDescription>Define rest periods and apply to days, months, or entire year</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Time Range Input */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Rest Period Time Range</Label>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">From:</Label>
                  <Input
                    type="time"
                    value={customRestStart}
                    onChange={(e) => setCustomRestStart(e.target.value)}
                    className="w-32"
                    data-testid="input-rest-start-time"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">To:</Label>
                  <Input
                    type="time"
                    value={customRestEnd}
                    onChange={(e) => setCustomRestEnd(e.target.value)}
                    className="w-32"
                    data-testid="input-rest-end-time"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Example: 20:00 to 06:00 for night rest</p>
            </div>

            {/* Apply to Current Month */}
            <div className="pt-3 border-t">
              <Label className="text-sm font-medium mb-2 block">Apply to Current Month</Label>
              <div className="flex gap-2 flex-wrap">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={applyCustomRestToAllDays}
                  className="bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900"
                  data-testid="button-apply-rest-all-days"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy to All Days of {meta.month}
                </Button>
              </div>
            </div>

            {/* Copy Month to Year */}
            <div className="pt-3 border-t">
              <Label className="text-sm font-medium mb-2 block">Copy Month to Entire Year</Label>
              <div className="space-y-3">
                <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-xs text-amber-800 dark:text-amber-200 mb-2">
                    This will copy the current month's schedule ({meta.month} {meta.year}) to all selected months of the year
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {MONTHS.map((month, idx) => (
                      <label key={month.label} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={monthsToCopy.includes(month.label)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setMonthsToCopy([...monthsToCopy, month.label]);
                            } else {
                              setMonthsToCopy(monthsToCopy.filter(m => m !== month.label));
                            }
                          }}
                          className="rounded"
                        />
                        <span>{month.label.slice(0, 3)}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="default"
                    onClick={copyMonthToYear}
                    disabled={monthsToCopy.length === 0}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    data-testid="button-copy-month-to-year"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy to {monthsToCopy.length} Selected Month(s)
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setMonthsToCopy(MONTHS.map(m => m.label))}
                  >
                    Select All
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setMonthsToCopy([])}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </div>

            {/* Remove Months */}
            <div className="pt-3 border-t">
              <Label className="text-sm font-medium mb-2 block">Clear Month Data</Label>
              <div className="space-y-3">
                <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-xs text-red-800 dark:text-red-200 mb-2">
                    Select months to clear their rest schedule data
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {MONTHS.map((month, idx) => (
                      <label key={month.label} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={monthsToRemove.includes(month.label)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setMonthsToRemove([...monthsToRemove, month.label]);
                            } else {
                              setMonthsToRemove(monthsToRemove.filter(m => m !== month.label));
                            }
                          }}
                          className="rounded"
                        />
                        <span>{month.label.slice(0, 3)}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={removeMonths}
                  disabled={monthsToRemove.length === 0}
                  data-testid="button-remove-months"
                >
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Clear {monthsToRemove.length} Selected Month(s)
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editing Tools */}
      <Card className="border-slate-200 dark:border-slate-700 shadow-md">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-b">
          <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-200">Editing Tools</CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-400">Click cells to toggle, or use paint mode to drag and fill multiple cells</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="p-4 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800 dark:to-blue-950 rounded-lg border border-slate-200 dark:border-slate-600">
              <div className="flex items-start gap-3">
                <Palette className="w-5 h-5 text-slate-600 dark:text-slate-400 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <Label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Smart Toggle Mode
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Click to toggle individual cells, or click and drag to toggle multiple cells. 
                    Cells automatically switch to their opposite state: <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-400 rounded-full"></span>REST → WORK</span> or <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 bg-rose-400 rounded-full"></span>WORK → REST</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
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

      {/* Rest Hours Grid or Mobile View */}
      {viewMode === 'mobile' ? (
        <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-b">
            <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-200">Day-by-Day View</CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">Optimized for mobile devices - tap time blocks to edit</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {displayRows.map((r, ri) => {
              const c = compliance[ri];
              const restChunks = chunks(r);
              return (
                <div key={r.date} className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-lg">{new Date(r.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</h4>
                      <p className="text-xs text-muted-foreground">{r.date}</p>
                    </div>
                    <Badge variant={c.dayOK ? 'default' : 'destructive'} className="ml-2">
                      {c.dayOK ? '✓ Compliant' : '✗ Violation'}
                    </Badge>
                  </div>
                  
                  <div className="relative h-12 bg-slate-100 dark:bg-slate-800 rounded-lg mb-3 overflow-hidden">
                    {restChunks.map(([start, end], idx) => {
                      const isRest = (r as any)[`h${start}`] === 1;
                      const width = ((end - start) / 24) * 100;
                      const left = (start / 24) * 100;
                      return (
                        <div
                          key={idx}
                          className={`absolute h-full ${isRest ? 'bg-emerald-400' : 'bg-rose-400'}`}
                          style={{ left: `${left}%`, width: `${width}%` }}
                          title={`${isRest ? 'REST' : 'WORK'} ${start}:00-${end}:00`}
                        />
                      );
                    })}
                    <div className="absolute inset-0 grid grid-cols-24">
                      {hours.map(h => (
                        <button
                          key={h}
                          onMouseDown={() => startDrag(ri, h)}
                          onMouseEnter={() => isDragging && onDrag(ri, h)}
                          className="border-l border-slate-300 dark:border-slate-600 first:border-l-0 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center p-2 bg-slate-50 dark:bg-slate-800 rounded">
                      <p className="text-muted-foreground">Rest Total</p>
                      <p className={`font-semibold ${c.restTotal >= 10 ? 'text-emerald-600' : 'text-rose-600'}`}>{c.restTotal}h</p>
                    </div>
                    <div className="text-center p-2 bg-slate-50 dark:bg-slate-800 rounded">
                      <p className="text-muted-foreground">Min 24h</p>
                      <p className={`font-semibold ${c.minRest24 >= 10 ? 'text-emerald-600' : 'text-rose-600'}`}>{c.minRest24.toFixed(0)}h</p>
                    </div>
                    <div className="text-center p-2 bg-slate-50 dark:bg-slate-800 rounded">
                      <p className="text-muted-foreground">Blocks</p>
                      <p className={`font-semibold ${c.splitOK ? 'text-emerald-600' : 'text-rose-600'}`}>{restChunks.filter(([a,b]) => (r as any)[`h${a}`] === 1).length}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-b">
            <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-200">Rest Hours Grid</CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              Click to toggle cells, drag to paint. <span className="inline-flex items-center gap-1"><span className="w-3 h-3 bg-emerald-200 dark:bg-emerald-800 rounded border"></span> REST</span> • <span className="inline-flex items-center gap-1"><span className="w-3 h-3 bg-rose-200 dark:bg-rose-800 rounded border"></span> WORK</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-inner" data-testid="rest-hours-grid">
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

              {displayRows.map((r, ri) => {
                const c = compliance[viewMode === 'week' ? weekOffset * 7 + ri : ri];
                const dayOK = c?.dayOK;
                const actualIndex = viewMode === 'week' ? weekOffset * 7 + ri : ri;
                return (
                  <div key={r.date} className={`group hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors ${selectedDay === actualIndex ? 'bg-blue-50 dark:bg-blue-950' : ''}`} onClick={() => setSelectedDay(actualIndex)}>
                    <div style={{ display: 'grid', gridTemplateColumns: `110px repeat(24, ${hourW}px) 75px 75px` }}>
                      <div className={`bg-slate-50 dark:bg-slate-800 border-r border-slate-300 dark:border-slate-600 px-3 py-2 flex items-center justify-center font-mono font-medium text-slate-700 dark:text-slate-300 ${!dayOK && liveCheck ? 'border-l-4 border-l-rose-500' : ''}`}>
                        <span className="text-xs">{r.date.slice(8, 10)}</span>
                      </div>
                      
                      {hours.map(h => {
                        const v = (r as any)[`h${h}`] || 0;
                        const isRest = v === 1;
                        const isNightHour = h >= 20 || h < 6;
                        return (
                          <div 
                            key={h}
                            onMouseDown={(e) => { 
                              e.preventDefault(); 
                              startDrag(actualIndex, h);
                            }}
                            onMouseEnter={() => onDrag(actualIndex, h)}
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
                            data-testid={`grid-cell-${actualIndex}-${h}`}
                            title={`${isRest ? 'REST' : 'WORK'} at ${String(h).padStart(2, '0')}:00${isNightHour ? ' (Night)' : ''}`}
                          >
                            {isRest && (
                              <div className="absolute inset-0 flex items-center justify-center opacity-20">
                                <div className="w-1 h-1 bg-emerald-600 dark:bg-emerald-400 rounded-full"></div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      
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
      )}

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
