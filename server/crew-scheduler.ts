/**
 * Crew Scheduling Algorithm
 * 
 * Intelligent greedy scheduling system for maritime crew that considers:
 * - Required skills for shifts
 * - Vessel assignments 
 * - Leave periods
 * - Minimum rest requirements
 * - Maximum hours per 7-day rolling window
 * - Crew availability and preferences
 * 
 * Translated from Python/FastAPI to TypeScript/Node.js
 */

import { SelectCrew, SelectCrewLeave, SelectShiftTemplate, SelectCrewAssignment, CrewWithSkills } from '@shared/schema';

interface Assignment {
  date: string;
  shiftId: string;
  crewId: string;
  vesselId?: string;
  start: string; // ISO timestamp
  end: string;   // ISO timestamp
  role?: string;
}

interface UnfilledShift {
  day: string;
  shiftId: string;
  need: number;
  reason: string;
}

/**
 * Check if two time ranges overlap
 */
function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return Math.max(aStart.getTime(), bStart.getTime()) < Math.min(aEnd.getTime(), bEnd.getTime());
}

/**
 * Parse ISO timestamp, handling 'Z' suffix
 */
function parseIso(s: string): Date {
  return new Date(s.replace('Z', ''));
}

/**
 * Calculate total hours worked by crew member in a given time range
 */
function hoursInRange(
  assignments: Assignment[], 
  crewId: string, 
  weekStart: Date, 
  weekEnd: Date
): number {
  let total = 0.0;
  
  for (const assignment of assignments) {
    if (assignment.crewId !== crewId) continue;
    
    const start = parseIso(assignment.start);
    const end = parseIso(assignment.end);
    const lo = new Date(Math.max(start.getTime(), weekStart.getTime()));
    const hi = new Date(Math.min(end.getTime(), weekEnd.getTime()));
    
    if (lo < hi) {
      total += (hi.getTime() - lo.getTime()) / (1000 * 60 * 60); // convert ms to hours
    }
  }
  
  return total;
}

/**
 * Check if crew member has sufficient rest time before new shift
 */
function restOk(
  assignments: Assignment[], 
  crewId: string, 
  start: Date, 
  minRestH: number
): boolean {
  let lastEnd: Date | null = null;
  
  // Find the most recent assignment end time for this crew member
  for (const assignment of assignments) {
    if (assignment.crewId !== crewId) continue;
    
    const end = parseIso(assignment.end);
    if (end <= start && (lastEnd === null || end > lastEnd)) {
      lastEnd = end;
    }
  }
  
  if (lastEnd === null) return true;
  
  const restHours = (start.getTime() - lastEnd.getTime()) / (1000 * 60 * 60);
  return restHours >= minRestH;
}

/**
 * Main scheduling algorithm - greedy fill approach
 */
export function planShifts(
  days: string[],
  shifts: SelectShiftTemplate[],
  crew: CrewWithSkills[],
  leaves: SelectCrewLeave[],
  existing: Assignment[] = []
): { scheduled: Assignment[]; unfilled: UnfilledShift[] } {
  
  const assignments: Assignment[] = [...existing];
  const unfilled: UnfilledShift[] = [];
  
  // Pre-index leaves per crew member for efficient lookup
  const leaveIndex: Map<string, Array<[Date, Date]>> = new Map();
  for (const leave of leaves) {
    const start = new Date(leave.start);
    const end = new Date(leave.end);
    
    if (!leaveIndex.has(leave.crewId)) {
      leaveIndex.set(leave.crewId, []);
    }
    leaveIndex.get(leave.crewId)!.push([start, end]);
  }
  
  /**
   * Check if crew member is on leave during shift period
   */
  function isOnLeave(crewId: string, start: Date, end: Date): boolean {
    const crewLeaves = leaveIndex.get(crewId) || [];
    return crewLeaves.some(([leaveStart, leaveEnd]) => 
      overlaps(leaveStart, leaveEnd, start, end)
    );
  }
  
  // Process each day and each shift
  for (const day of days) {
    for (const shift of shifts) {
      // Compute absolute shift window for this day
      const start = new Date(`${day}T${shift.start}`);
      const end = new Date(`${day}T${shift.end}`);
      
      // Handle midnight crossover (e.g., 23:00-07:00 shifts)
      if (end <= start) {
        end.setDate(end.getDate() + 1);
      }
      
      const needed = shift.needed || 1;
      const skillRequired = shift.skillRequired;
      const vesselId = shift.vesselId;
      const role = shift.role;
      const shiftId = shift.id;
      
      let picked = 0;
      
      // Rank crew: matching vessel first, then by rank for consistency
      const rankedCrew = [...crew].sort((a, b) => {
        // Primary sort: vessel match (0 = match, 1 = no match)
        const aVesselMatch = !vesselId || a.vesselId === vesselId ? 0 : 1;
        const bVesselMatch = !vesselId || b.vesselId === vesselId ? 0 : 1;
        
        if (aVesselMatch !== bVesselMatch) {
          return aVesselMatch - bVesselMatch;
        }
        
        // Secondary sort: by rank alphabetically for consistency
        return (a.rank || '').localeCompare(b.rank || '');
      });
      
      for (const crewMember of rankedCrew) {
        if (picked >= needed) break;
        if (!crewMember.active) continue;
        
        const crewId = crewMember.id;
        const minRest = crewMember.minRestH || 10;
        const max7d = crewMember.maxHours7d || 72;
        
        // Check required skills
        if (skillRequired && !crewMember.skills.includes(skillRequired)) {
          continue;
        }
        
        // Check vessel assignment
        if (vesselId && crewMember.vesselId && crewMember.vesselId !== vesselId) {
          continue;
        }
        
        // Check leave period
        if (isOnLeave(crewId, start, end)) {
          continue;
        }
        
        // Check rest requirement
        if (!restOk(assignments, crewId, start, minRest)) {
          continue;
        }
        
        // Check 7-day hour limit
        const weekStart = new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000);
        const weekEnd = new Date(start.getTime() + 1); // tiny epsilon
        const shiftHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        
        if (hoursInRange(assignments, crewId, weekStart, weekEnd) + shiftHours > max7d) {
          continue;
        }
        
        // All constraints satisfied - assign crew member
        assignments.push({
          date: day,
          shiftId: shiftId!,
          crewId: crewId,
          vesselId: vesselId || undefined,
          start: start.toISOString(),
          end: end.toISOString(),
          role: role || undefined
        });
        
        picked++;
      }
      
      // Track unfilled positions
      if (picked < needed) {
        unfilled.push({
          day: day,
          shiftId: shiftId,
          need: needed - picked,
          reason: "insufficient crew for constraints"
        });
      }
    }
  }
  
  return { scheduled: assignments, unfilled };
}

/**
 * Utility to generate date range for scheduling
 */
export function generateDays(startDate: string, numDays: number): string[] {
  const days: string[] = [];
  const base = new Date(startDate);
  
  for (let i = 0; i < numDays; i++) {
    const date = new Date(base.getTime() + i * 24 * 60 * 60 * 1000);
    days.push(date.toISOString().slice(0, 10)); // YYYY-MM-DD format
  }
  
  return days;
}