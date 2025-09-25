/**
 * Time Utilities - Singapore Time (SGT) Support
 * 
 * Provides consistent time handling across the ARUS system
 * with primary support for Singapore Time (UTC+8) for maritime operations.
 */

// Singapore Time constants
export const SGT_TIMEZONE = 'Asia/Singapore';
export const SGT_OFFSET_HOURS = 8;

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
 * Maritime-specific: Check if time falls within night shift hours (20:00-06:00 SGT)
 * Used for crew scheduling fairness calculations
 */
export function isNightShift(time: Date): boolean {
  // Get SGT hour without mutating the timestamp
  const sgtHour = parseInt(new Intl.DateTimeFormat('en-GB', {
    timeZone: SGT_TIMEZONE,
    hour: '2-digit',
    hour12: false
  }).format(time));
  return sgtHour >= 20 || sgtHour < 6;
}

/**
 * Format Date as YYYY-MM-DD in Singapore Time (display only, no timestamp mutation)
 */
export function toDateSgt(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SGT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

/**
 * Format Date as HH:MM:SS in Singapore Time (display only, no timestamp mutation)
 */
export function toTimeSgt(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: SGT_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date);
}

/**
 * Format Date for display in Singapore Time with timezone indicator
 */
export function formatSgtDisplay(date: Date): string {
  const dateStr = toDateSgt(date);
  const timeStr = toTimeSgt(date);
  return `${dateStr} ${timeStr} SGT`;
}

/**
 * Get current timestamp as ISO string in Singapore Time
 */
export function nowIsoSgt(): string {
  const now = new Date();
  // Use Intl to get SGT components
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: SGT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(now);
  const partsMap = parts.reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {} as any);
  
  return `${partsMap.year}-${partsMap.month}-${partsMap.day}T${partsMap.hour}:${partsMap.minute}:${partsMap.second}+08:00`;
}

/**
 * Maritime-specific: Get vessel timezone formatting info (no timestamp mutation)
 * Returns display formatting for the specified timezone
 */
export function getVesselTimeInfo(utcTime: Date, vesselTimezone: string = SGT_TIMEZONE): {
  date: string;
  time: string;
  timezone: string;
  display: string;
} {
  try {
    // Use formatToParts to safely extract date/time components
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: vesselTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).formatToParts(utcTime);
    
    const partsMap = parts.reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {} as any);
    
    const date = `${partsMap.year}-${partsMap.month}-${partsMap.day}`;
    const time = `${partsMap.hour}:${partsMap.minute}:${partsMap.second}`;
    const timezone = vesselTimezone === SGT_TIMEZONE ? 'SGT' : vesselTimezone;
    
    return {
      date,
      time,
      timezone,
      display: `${date} ${time} ${timezone}`
    };
  } catch (error) {
    console.warn(`Invalid timezone ${vesselTimezone}, falling back to Singapore Time`);
    return getVesselTimeInfo(utcTime, SGT_TIMEZONE);
  }
}

/**
 * Legacy function: Get vessel local time (for backward compatibility)
 * NOTE: This preserves the original timestamp and only changes display context
 */
export function toVesselTime(utcTime: Date, vesselTimezone?: string): Date {
  // For backward compatibility, return the original timestamp unchanged
  // Timezone conversion should be handled at the presentation layer
  return utcTime;
}

/**
 * Get start of day in Singapore Time (returns UTC timestamp for SGT midnight)
 */
export function startOfDaySgt(date: Date): Date {
  // Get SGT date components using Intl
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SGT_TIMEZONE,
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit'
  }).formatToParts(date);
  
  const partsMap = parts.reduce((acc, part) => {
    acc[part.type] = parseInt(part.value);
    return acc;
  }, {} as any);
  
  // Create UTC timestamp representing SGT midnight using Date.UTC constructor
  // SGT midnight = UTC 16:00 previous day (UTC - 8 hours)
  return new Date(Date.UTC(partsMap.year, partsMap.month - 1, partsMap.day, -SGT_OFFSET_HOURS, 0, 0, 0));
}

/**
 * Get end of day in Singapore Time (returns UTC timestamp for SGT end of day)
 */
export function endOfDaySgt(date: Date): Date {
  // Get SGT date components using Intl
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SGT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  
  const partsMap = parts.reduce((acc, part) => {
    acc[part.type] = parseInt(part.value);
    return acc;
  }, {} as any);
  
  // Create UTC timestamp representing SGT end of day using Date.UTC constructor
  // SGT 23:59:59.999 = UTC 15:59:59.999 same day (UTC - 8 hours)
  return new Date(Date.UTC(partsMap.year, partsMap.month - 1, partsMap.day, 23 - SGT_OFFSET_HOURS, 59, 59, 999));
}