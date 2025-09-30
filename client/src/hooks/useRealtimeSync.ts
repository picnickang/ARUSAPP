import { useEffect } from 'react';
import { useWebSocket } from './useWebSocket';
import { queryClient } from '@/lib/queryClient';

interface DataChangeMessage {
  type: 'data_change';
  entity: string;
  operation: 'create' | 'update' | 'delete';
  data: any;
  timestamp: string;
}

/**
 * Global WebSocket listener hook that automatically invalidates TanStack Query cache
 * when data changes are broadcast from the server.
 * 
 * This enables real-time multi-device synchronization across all connected clients.
 */
export function useRealtimeSync() {
  const { lastMessage, subscribe, isConnected } = useWebSocket({ autoConnect: true });

  useEffect(() => {
    if (isConnected) {
      // Subscribe to the global data changes channel
      subscribe('data:all');
    }
  }, [isConnected, subscribe]);

  useEffect(() => {
    if (!lastMessage || lastMessage.type !== 'data_change') {
      return;
    }

    const message = lastMessage as DataChangeMessage;
    
    // Map entity names to their corresponding API endpoints and query keys
    const entityToQueryKey: Record<string, string[]> = {
      'work_orders': ['/api/work-orders', '/api/dashboard'],
      'equipment': ['/api/equipment-registry', '/api/equipment', '/api/dashboard'],
      'vessels': ['/api/vessels', '/api/dashboard'],
      'crew': ['/api/crew', '/api/dashboard'],
      'maintenance_schedules': ['/api/maintenance-schedules', '/api/dashboard'],
      'crew_assignments': ['/api/crew-assignments', '/api/crew'],
      'parts': ['/api/parts', '/api/inventory'],
      'stock': ['/api/stock', '/api/inventory'],
    };

    const queryKeys = entityToQueryKey[message.entity] || [];
    
    if (queryKeys.length > 0) {
      // Invalidate all relevant query keys to trigger refetch
      queryKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
      
      console.log(`[Real-time Sync] ${message.operation} on ${message.entity} - invalidated cache for:`, queryKeys);
    }
  }, [lastMessage]);

  return {
    isConnected,
    lastMessage,
  };
}
