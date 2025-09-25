/**
 * STCW Hours of Rest Compliance Engine
 * Translated from Python patch to TypeScript for ARUS system
 * Checks compliance with STCW regulations for minimum rest requirements
 */

// STCW minimum rest requirements
const STCW_MIN_REST_24 = 10; // minimum 10 hours rest in any 24-hour period
const STCW_MIN_REST_7D = 77;  // minimum 77 hours rest in any 7-day period

export interface RestDay {
  date: string;
  h0?: number; h1?: number; h2?: number; h3?: number; h4?: number; h5?: number;
  h6?: number; h7?: number; h8?: number; h9?: number; h10?: number; h11?: number;
  h12?: number; h13?: number; h14?: number; h15?: number; h16?: number; h17?: number;
  h18?: number; h19?: number; h20?: number; h21?: number; h22?: number; h23?: number;
  [key: string]: string | number | undefined; // Allow dynamic access to hourly fields
}

export interface RestChunk {
  start: number;
  end: number;
}

export interface DayComplianceResult {
  date: string;
  rest_total: number;
  min_rest_24: number;
  chunks: RestChunk[];
  split_ok: boolean;
  day_ok: boolean;
}

export interface RollingComplianceResult {
  end_date: string;
  rest_7d: number;
  ok: boolean;
}

export interface MonthComplianceResult {
  ok: boolean;
  days: DayComplianceResult[];
  rolling7d: RollingComplianceResult[];
}

/**
 * Extract contiguous rest chunks from a day's hourly data
 * Returns list of chunks as {start_hour, end_hour_exclusive}
 */
function chunksFromDay(day: RestDay): RestChunk[] {
  const chunks: RestChunk[] = [];
  let currentStart: number | null = null;

  for (let h = 0; h < 24; h++) {
    const v = parseInt(String(day[`h${h}` as keyof RestDay] || 0));
    
    // Start of rest period
    if (v === 1 && currentStart === null) {
      currentStart = h;
    }
    
    // End of rest period (work starts or end of day)
    if ((v === 0 || h === 23) && currentStart !== null) {
      const end = v === 0 ? h : 24;
      chunks.push({ start: currentStart, end });
      currentStart = null;
    }
  }
  
  return chunks;
}

/**
 * Compute rest hours in any 24-hour window ending at 'center' index
 * (hours from day 0 00:00)
 */
function restHoursInWindow(days: RestDay[], center: number): number {
  // Flatten all hours into a single array
  const hourlyData: number[] = [];
  for (const day of days) {
    for (let i = 0; i < 24; i++) {
      hourlyData.push(parseInt(String(day[`h${i}` as keyof RestDay] || 0)));
    }
  }
  
  const start = Math.max(0, center - 24);
  const window = hourlyData.slice(start, center);
  return window.reduce((sum, val) => sum + val, 0);
}

/**
 * Normalize rest day data to ensure all hourly fields are integers
 */
export function normalizeRestDays(rows: any[]): RestDay[] {
  return rows.map(row => {
    const normalized: RestDay = { date: row.date };
    
    // Ensure all h0-h23 fields are integers
    for (let i = 0; i < 24; i++) {
      const key = `h${i}` as keyof RestDay;
      normalized[key] = parseInt(String(row[key] || row[String(i)] || 0)) || 0;
    }
    
    return normalized;
  });
}

/**
 * Check STCW compliance for a full month of rest data
 * Returns detailed compliance analysis for each day and rolling 7-day periods
 */
export function checkMonthCompliance(days: RestDay[]): MonthComplianceResult {
  const results: DayComplianceResult[] = [];
  
  // Check each day for compliance
  for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
    const day = days[dayIndex];
    const chunks = chunksFromDay(day);
    
    // Calculate total rest hours for the day
    const totalRest = (() => {
      let total = 0;
      for (let i = 0; i < 24; i++) {
        total += parseInt(String(day[`h${i}` as keyof RestDay] || 0));
      }
      return total;
    })();
    
    // Check split rule: ≤2 periods and at least one ≥6h
    const splitOk = chunks.length <= 2 && 
                    (chunks.length === 0 || chunks.some(chunk => (chunk.end - chunk.start) >= 6));
    
    // Check 10h/24h rule using sliding 24-hour windows
    let minRest24 = 999;
    
    // Evaluate sliding windows ending at each hour boundary of the next day
    for (let hh = dayIndex * 24 + 1; hh <= dayIndex * 24 + 24; hh++) {
      const restInWindow = restHoursInWindow(days, hh);
      if (restInWindow < minRest24) {
        minRest24 = restInWindow;
      }
    }
    
    const dayOk = (minRest24 >= STCW_MIN_REST_24) && splitOk;
    
    results.push({
      date: day.date,
      rest_total: totalRest,
      min_rest_24: minRest24,
      chunks,
      split_ok: splitOk,
      day_ok: dayOk
    });
  }
  
  // Check rolling 7-day compliance
  const rolling7d: RollingComplianceResult[] = [];
  
  for (let i = 0; i < days.length; i++) {
    // Get 7-day block ending on day i
    const blockStart = Math.max(0, i - 6);
    const block = days.slice(blockStart, i + 1);
    
    // Calculate total rest hours in this 7-day period
    let totalRest7d = 0;
    for (const day of block) {
      for (let h = 0; h < 24; h++) {
        totalRest7d += parseInt(String(day[`h${h}` as keyof RestDay] || 0));
      }
    }
    
    rolling7d.push({
      end_date: days[i].date,
      rest_7d: totalRest7d,
      ok: totalRest7d >= STCW_MIN_REST_7D
    });
  }
  
  // Overall monthly compliance
  const allDaysOk = results.every(r => r.day_ok);
  const all7dOk = rolling7d.every(r => r.ok);
  const monthlyOk = allDaysOk && all7dOk;
  
  return {
    ok: monthlyOk,
    days: results,
    rolling7d
  };
}

// Sample data generation functions removed for production deployment