import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getCurrentDeviceId } from "@/hooks/useDeviceId";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Helper function to create headers with device ID and organization ID
function createHeaders(includeContentType: boolean = false): Record<string, string> {
  const headers: Record<string, string> = {};
  
  // Add Content-Type if needed
  if (includeContentType) {
    headers["Content-Type"] = "application/json";
  }
  
  // Add x-org-id header for multi-tenant isolation (matches server expectation)
  headers["x-org-id"] = "default-org-id";
  
  // Add X-Device-Id header if available (Hub & Sync functionality)
  const deviceId = getCurrentDeviceId();
  if (deviceId) {
    headers["X-Device-Id"] = deviceId;
  }
  
  return headers;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  const res = await fetch(url, {
    method,
    headers: createHeaders(!!data),
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  // Handle 204 No Content responses (e.g., successful DELETE operations)
  if (res.status === 204) {
    return null;
  }
  
  // Only parse JSON if there's a response body
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      headers: createHeaders(false), // Include device ID headers for queries too
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// Cache time constants for different data types
export const CACHE_TIMES = {
  REALTIME: 30000,     // 30s - telemetry, alerts, live data
  MODERATE: 300000,    // 5min - devices, work orders, fleet status  
  STABLE: 1800000,     // 30min - vessels, equipment catalog, users
  EXPENSIVE: 3600000,  // 1hr - AI insights, reports, heavy computations
} as const;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false, // Disable global polling - set per query based on data type
      refetchOnWindowFocus: false,
      staleTime: CACHE_TIMES.MODERATE, // 5min default - reasonable for most data
      retry: 1, // Single retry for network issues
    },
    mutations: {
      retry: 1, // Single retry for mutations
    },
  },
});
