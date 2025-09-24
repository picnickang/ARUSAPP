/**
 * UTC Time Utilities - Translated from Python patch to TypeScript
 * 
 * Provides consistent UTC time handling across the ARUS system
 * to ensure accurate timestamps for maritime operations.
 */

/**
 * Get current timestamp as UTC Date object (strictly UTC)
 */
export function nowUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds(),
    now.getUTCMilliseconds()
  ));
}

/**
 * Parse ISO string to UTC Date with strict validation and no calendar rollover
 * Requires explicit UTC indicators: 'Z' suffix or explicit offset
 */
export function parseIsoUtc(isoString: string): Date {
  // Strict validation: must have 'Z' suffix or explicit timezone offset
  if (!isoString.endsWith('Z') && !isoString.match(/[+-]\d{2}:\d{2}$/)) {
    throw new Error(`Invalid UTC ISO string - must have 'Z' suffix or explicit offset: ${isoString}`);
  }
  
  try {
    // Parse components manually to prevent rollover
    const workingString = isoString.endsWith('Z') ? isoString.slice(0, -1) : isoString.split(/[+-]/)[0];
    const [datePart, timePart] = workingString.split('T');
    
    if (!datePart || !timePart) {
      throw new Error(`Invalid ISO string format: ${isoString}`);
    }
    
    const [yearStr, monthStr, dayStr] = datePart.split('-');
    const timeComponents = timePart.split('.')[0].split(':');
    const [hourStr, minuteStr, secondStr] = timeComponents;
    
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    const second = parseInt(secondStr, 10);
    
    // Basic range validation
    if (month < 1 || month > 12) throw new Error(`Invalid month: ${month}`);
    if (day < 1 || day > 31) throw new Error(`Invalid day: ${day}`);
    if (hour < 0 || hour > 23) throw new Error(`Invalid hour: ${hour}`);
    if (minute < 0 || minute > 59) throw new Error(`Invalid minute: ${minute}`);
    if (second < 0 || second > 59) throw new Error(`Invalid second: ${second}`);
    
    // Create date and verify it didn't roll over
    const parsed = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
    if (isNaN(parsed.getTime())) {
      throw new Error(`Invalid date components: ${isoString}`);
    }
    
    // Verify the components match exactly (no rollover)
    if (parsed.getUTCFullYear() !== year ||
        parsed.getUTCMonth() !== month - 1 ||
        parsed.getUTCDate() !== day ||
        parsed.getUTCHours() !== hour ||
        parsed.getUTCMinutes() !== minute ||
        parsed.getUTCSeconds() !== second) {
      throw new Error(`Calendar rollover detected in ISO string: ${isoString}`);
    }
    
    return parsed;
    
  } catch (error) {
    throw new Error(`Failed to parse ISO UTC string "${isoString}": ${error instanceof Error ? error.message : error}`);
  }
}

/**
 * Convert Date to ISO string (UTC)
 */
export function toIsoUtc(date: Date): string {
  return date.toISOString();
}

/**
 * Get current timestamp as ISO string (UTC)
 */
export function nowIsoUtc(): string {
  return toIsoUtc(nowUtc());
}

/**
 * Format Date as YYYY-MM-DD (UTC date part only)
 */
export function toDateUtc(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Format Date as HH:MM:SS (UTC time part only)
 */
export function toTimeUtc(date: Date): string {
  return date.toISOString().split('T')[1].split('.')[0];
}

/**
 * Create UTC Date from date components
 */
export function fromUtcComponents(
  year: number, 
  month: number, 
  day: number, 
  hour: number = 0, 
  minute: number = 0, 
  second: number = 0
): Date {
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
}

/**
 * Check if a date string is valid UTC date format (YYYY-MM-DD) with strict calendar validation
 */
export function isValidUtcDate(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) {
    return false;
  }
  
  // Parse components manually to prevent rollover
  const [yearStr, monthStr, dayStr] = dateString.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  
  // Basic range validation
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  
  // Create date and verify it didn't roll over
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (isNaN(parsed.getTime())) return false;
  
  // Verify the components match exactly (no rollover)
  return parsed.getUTCFullYear() === year &&
         parsed.getUTCMonth() === month - 1 &&
         parsed.getUTCDate() === day;
}

/**
 * Check if a time string is valid UTC time format (HH:MM:SS)
 */
export function isValidUtcTime(timeString: string): boolean {
  const regex = /^\d{2}:\d{2}:\d{2}$/;
  if (!regex.test(timeString)) {
    return false;
  }
  
  const [hours, minutes, seconds] = timeString.split(':').map(Number);
  return hours >= 0 && hours < 24 && 
         minutes >= 0 && minutes < 60 && 
         seconds >= 0 && seconds < 60;
}

/**
 * Add days to a UTC date
 */
export function addDaysUtc(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/**
 * Get start of day in UTC
 */
export function startOfDayUtc(date: Date): Date {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  ));
}

/**
 * Get end of day in UTC
 */
export function endOfDayUtc(date: Date): Date {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    23, 59, 59, 999
  ));
}

/**
 * Generate unique request ID for tracing
 */
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Calculate duration between two dates in seconds
 */
export function durationSeconds(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / 1000;
}

/**
 * Maritime-specific: Check if time falls within night shift hours (20:00-06:00 UTC)
 * Used for crew scheduling fairness calculations
 */
export function isNightShift(time: Date): boolean {
  const hours = time.getUTCHours();
  return hours >= 20 || hours < 6;
}

/**
 * Maritime-specific: Get vessel local time from UTC
 * Placeholder for future timezone handling based on vessel location
 */
export function toVesselTime(utcTime: Date, vesselTimezone?: string): Date {
  // For now, return UTC. Future enhancement could use vessel's timezone
  // if (vesselTimezone) {
  //   // Convert using vessel's timezone
  // }
  return utcTime;
}