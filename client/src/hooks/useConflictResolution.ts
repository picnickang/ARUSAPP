import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, CACHE_TIMES } from "@/lib/queryClient";
import type { SyncConflict } from "@shared/sync-conflicts-schema";

/**
 * Hook to fetch pending conflicts for the current organization
 */
export function usePendingConflicts() {
  return useQuery<{ conflicts: SyncConflict[] }>({
    queryKey: ["/api/sync/pending-conflicts"],
    staleTime: CACHE_TIMES.REALTIME, // 30s - conflicts need to be fresh
    refetchInterval: 30000, // Poll every 30s for new conflicts
  });
}

/**
 * Hook to check for conflicts before syncing data
 */
export function useCheckConflicts() {
  return useMutation({
    mutationFn: async (params: {
      table: string;
      recordId: string;
      data: Record<string, any>;
      version: number;
      timestamp: string;
      user: string;
      device: string;
      orgId: string;
    }) => {
      return apiRequest("POST", "/api/sync/check-conflicts", params);
    },
    onSuccess: (result) => {
      // If conflicts detected, invalidate pending conflicts to refresh the list
      if (result.hasConflict) {
        queryClient.invalidateQueries({ queryKey: ["/api/sync/pending-conflicts"] });
      }
    },
  });
}

/**
 * Hook to manually resolve a conflict
 */
export function useResolveConflict() {
  return useMutation({
    mutationFn: async (params: {
      conflictId: string;
      resolvedValue: any;
      resolvedBy: string;
    }) => {
      return apiRequest("POST", "/api/sync/resolve-conflict", params);
    },
    onSuccess: () => {
      // Invalidate pending conflicts to refresh the list after resolution
      queryClient.invalidateQueries({ queryKey: ["/api/sync/pending-conflicts"] });
    },
  });
}

/**
 * Hook to auto-resolve non-safety-critical conflicts
 */
export function useAutoResolveConflicts() {
  return useMutation({
    mutationFn: async (params: {
      conflictIds: string[];
      resolvedBy: string;
    }) => {
      return apiRequest("POST", "/api/sync/auto-resolve", params);
    },
    onSuccess: () => {
      // Invalidate pending conflicts to refresh the list after auto-resolution
      queryClient.invalidateQueries({ queryKey: ["/api/sync/pending-conflicts"] });
    },
  });
}
