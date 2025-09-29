export type Normalized = { value: number | null; unit?: string };

export function toCanonical(kind: string, value: number | null, unit?: string): Normalized {
  if (value == null || !isFinite(value)) return { value: null, unit };
  
  const u = (unit || "").toLowerCase();
  
  switch (kind) {
    case "temperature":
      if (u === "f") return { value: (value - 32) * 5 / 9, unit: "C" };
      return { value, unit: "C" };
    
    case "pressure":
      if (u === "psi") return { value: value * 6.894757, unit: "kPa" };
      if (u === "bar") return { value: value * 100, unit: "kPa" };
      return { value, unit: "kPa" };
    
    case "flow":
      if (u === "gph") return { value: value * 3.78541, unit: "L/h" };
      return { value, unit: "L/h" };
    
    case "vibration":
      // assume already mm/s; extend as needed (ips -> mm/s)
      return { value, unit: "mm/s" };
    
    case "voltage":
      return { value, unit: "V" };
    
    case "current":
      return { value, unit: "A" };
    
    case "frequency":
      return { value, unit: "Hz" };
    
    case "rpm":
      return { value, unit: "rpm" };
    
    case "level":
      return { value, unit: "%" };
    
    default:
      return { value, unit };
  }
}