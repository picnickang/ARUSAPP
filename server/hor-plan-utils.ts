/**
 * Hours of Rest Planning Utilities
 * TypeScript translation of HoR planner utilities for ARUS crew scheduling integration
 */

import { checkMonthCompliance, RestDay } from './stcw-compliance';

export interface HoRAssignment {
  date: string;
  start: string; // ISO timestamp
  end: string;   // ISO timestamp
  crewId: string;
  shiftId?: string;
  vesselId?: string;
}

export interface HoRContext {
  rest_7d: number;
  min_rest_24: number;
  nights_this_week: number;
}

export interface CrewHoRContext {
  crew_id: string;
  context: HoRContext;
  history_rows: RestDay[];
  merged_rows: RestDay[];
}

/**
 * Format date to ISO date string (YYYY-MM-DD)
 */
function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Extract year and month from date string
 */
function ymFromDate(dateStr: string): [number, number] {
  const date = new Date(dateStr);
  return [date.getFullYear(), date.getMonth() + 1];
}

/**
 * Create empty rest rows for date range with default REST=1 (work=0)
 */
function emptyRowsForRange(startDate: string, endDate: string): RestDay[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const rows: RestDay[] = [];
  
  const current = new Date(start);
  while (current <= end) {
    const dateStr = isoDate(current);
    const row: RestDay = {
      date: dateStr,
      h0: 1, h1: 1, h2: 1, h3: 1, h4: 1, h5: 1,
      h6: 1, h7: 1, h8: 1, h9: 1, h10: 1, h11: 1,
      h12: 1, h13: 1, h14: 1, h15: 1, h16: 1, h17: 1,
      h18: 1, h19: 1, h20: 1, h21: 1, h22: 1, h23: 1
    };
    rows.push(row);
    current.setDate(current.getDate() + 1);
  }
  
  return rows;
}

/**
 * Apply crew assignments as work periods (mark assigned hours as WORK=0)
 */
function applyAssignmentsAsWork(rows: RestDay[], assignments: HoRAssignment[]): RestDay[] {
  const byDate: { [date: string]: RestDay } = {};
  
  // Index rows by date
  for (const row of rows) {
    byDate[row.date] = { ...row };
  }
  
  // Apply assignments as work periods
  for (const assignment of assignments) {
    const assignmentDate = new Date(assignment.date);
    const startTime = new Date(assignment.start.replace('Z', ''));
    const endTime = new Date(assignment.end.replace('Z', ''));
    
    // Handle shifts that may span multiple days (e.g., night shifts crossing midnight)
    let currentDate = new Date(assignmentDate);
    let currentHour = startTime.getHours();
    const endHour = endTime.getHours();
    const endDate = new Date(endTime.getFullYear(), endTime.getMonth(), endTime.getDate());
    
    // Continue until we reach the end time
    while (currentDate <= endDate) {
      const dateStr = isoDate(currentDate);
      
      if (dateStr in byDate) {
        // Determine the end hour for this date
        let dayEndHour: number;
        if (currentDate.getTime() === endDate.getTime()) {
          // Same day as end time
          dayEndHour = endHour === 0 ? 24 : endHour; // Handle midnight as 24:00
        } else {
          // Not the final day, go to end of day
          dayEndHour = 24;
        }
        
        // Mark hours as work (0) for this date
        for (let hour = currentHour; hour < dayEndHour; hour++) {
          const hourKey = `h${hour % 24}` as keyof RestDay; // Handle hour 24 as hour 0
          if (hourKey in byDate[dateStr]) {
            (byDate[dateStr] as any)[hourKey] = 0;
          }
        }
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
      currentHour = 0; // Start from beginning of next day
    }
  }
  
  return Object.values(byDate);
}

/**
 * Merge historical rest data with planned assignments
 * Uses history where present, otherwise defaults to REST=1, then overlays plan as WORK=0
 */
export function mergeHistoryWithPlan(
  historyRows: RestDay[],
  planAssignments: HoRAssignment[],
  startDate: string,
  endDate: string
): RestDay[] {
  // Start with default rest for the entire range
  const rows = emptyRowsForRange(startDate, endDate);
  const byDate: { [date: string]: RestDay } = {};
  
  // Index by date
  for (const row of rows) {
    byDate[row.date] = { ...row };
  }
  
  // Overlay historical data where available
  for (const historyRow of historyRows) {
    const date = historyRow.date;
    if (date in byDate) {
      // Copy all hour values from history
      for (let h = 0; h < 24; h++) {
        const hourKey = `h${h}` as keyof RestDay;
        (byDate[date] as any)[hourKey] = (historyRow as any)[hourKey] || 1;
      }
    }
  }
  
  // Apply planned assignments as work periods
  const finalRows = applyAssignmentsAsWork(Object.values(byDate), planAssignments);
  
  return finalRows;
}

/**
 * Summarize Hours of Rest context for crew scheduling
 * Derives context like nights_this_week, min_rest_24, rest_7d
 */
export function summarizeHoRContext(historyRows: RestDay[]): HoRContext {
  if (!historyRows || historyRows.length === 0) {
    return {
      rest_7d: 0,
      min_rest_24: 0,
      nights_this_week: 0
    };
  }
  
  // Check STCW compliance using existing system
  const recentRows = historyRows.slice(-7); // Last 7 days
  const compliance = checkMonthCompliance(recentRows);
  
  // Calculate nights worked this week (approximate)
  // Night hours: 20:00-05:59 (hours 20-23, 0-5)
  let nightsThisWeek = 0;
  for (const row of recentRows) {
    const nightHours = [0, 1, 2, 3, 4, 5, 20, 21, 22, 23];
    let nightWorkHours = 0;
    
    for (const hour of nightHours) {
      const hourKey = `h${hour}` as keyof RestDay;
      if ((row as any)[hourKey] === 0) { // 0 = work
        nightWorkHours++;
      }
    }
    
    // If worked significant night hours, count as a night shift
    if (nightWorkHours >= 4) {
      nightsThisWeek++;
    }
  }
  
  // Get latest rolling 7-day rest and minimum 24h rest
  const latestRolling = compliance.rolling7d.length > 0 ? compliance.rolling7d[compliance.rolling7d.length - 1] : null;
  const latestDay = compliance.days.length > 0 ? compliance.days[compliance.days.length - 1] : null;
  
  return {
    rest_7d: latestRolling?.rest_7d || 0,
    min_rest_24: latestDay?.min_rest_24 || 0,
    nights_this_week: nightsThisWeek
  };
}

/**
 * Prepare HoR context for multiple crew members for planning
 */
export async function prepareCrewHoRContext(
  crewIds: string[],
  startDate: string,
  endDate: string,
  getHistoryRows: (crewId: string, start: string, end: string) => Promise<RestDay[]>
): Promise<CrewHoRContext[]> {
  const results: CrewHoRContext[] = [];
  
  for (const crewId of crewIds) {
    try {
      // Fetch historical rest data for this crew member
      const historyRows = await getHistoryRows(crewId, startDate, endDate);
      
      // Summarize current context
      const context = summarizeHoRContext(historyRows);
      
      // Create empty merged rows (will be populated with plan later)
      const mergedRows = emptyRowsForRange(startDate, endDate);
      
      results.push({
        crew_id: crewId,
        context,
        history_rows: historyRows,
        merged_rows: mergedRows
      });
    } catch (error) {
      console.warn(`Failed to prepare HoR context for crew ${crewId}:`, error);
      
      // Provide fallback context
      results.push({
        crew_id: crewId,
        context: { rest_7d: 0, min_rest_24: 0, nights_this_week: 0 },
        history_rows: [],
        merged_rows: emptyRowsForRange(startDate, endDate)
      });
    }
  }
  
  return results;
}