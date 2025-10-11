import { useMutation, UseMutationResult } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CrudMutationOptions<TData = any> {
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
  invalidateQueries?: string[]; // Additional query keys to invalidate
}

/**
 * Reusable hook for CREATE operations
 * Automatically handles: API request, query invalidation, toast notifications
 * 
 * @example
 * const createMutation = useCreateMutation<SensorConfigFormData>('/api/sensor-configs', {
 *   successMessage: "Sensor configuration created successfully",
 *   onSuccess: () => setDialogOpen(false)
 * });
 */
export function useCreateMutation<TInput, TOutput = any>(
  endpoint: string,
  options?: CrudMutationOptions<TOutput>
): UseMutationResult<TOutput, Error, TInput> {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: TInput) => apiRequest('POST', endpoint, data),
    onSuccess: (data) => {
      // Invalidate the main endpoint query
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      
      // Invalidate any additional queries specified
      options?.invalidateQueries?.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      });

      toast({
        title: "Created",
        description: options?.successMessage || "Successfully created",
      });

      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      toast({
        title: "Creation Failed",
        description: options?.errorMessage || error.message,
        variant: "destructive",
      });

      options?.onError?.(error);
    },
  });
}

/**
 * Reusable hook for UPDATE operations
 * Automatically handles: API request, query invalidation, toast notifications
 * 
 * @example
 * const updateMutation = useUpdateMutation<SensorConfigFormData>('/api/sensor-configs', {
 *   successMessage: "Sensor configuration updated successfully",
 *   onSuccess: () => setDialogOpen(false)
 * });
 * // Usage: updateMutation.mutate({ id: '123', data: { ... } })
 */
export function useUpdateMutation<TInput, TOutput = any>(
  endpoint: string,
  options?: CrudMutationOptions<TOutput>
): UseMutationResult<TOutput, Error, { id: string; data: Partial<TInput> }> {
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TInput> }) =>
      apiRequest('PUT', `${endpoint}/${id}`, data),
    onSuccess: (data) => {
      // Invalidate the main endpoint query
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      
      // Invalidate any additional queries specified
      options?.invalidateQueries?.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      });

      toast({
        title: "Updated",
        description: options?.successMessage || "Successfully updated",
      });

      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: options?.errorMessage || error.message,
        variant: "destructive",
      });

      options?.onError?.(error);
    },
  });
}

/**
 * Reusable hook for DELETE operations
 * Automatically handles: API request, query invalidation, toast notifications
 * 
 * @example
 * const deleteMutation = useDeleteMutation('/api/sensor-configs', {
 *   successMessage: "Sensor configuration deleted successfully"
 * });
 * // Usage: deleteMutation.mutate('config-id-123')
 */
export function useDeleteMutation<TOutput = any>(
  endpoint: string,
  options?: CrudMutationOptions<TOutput>
): UseMutationResult<TOutput, Error, string> {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `${endpoint}/${id}`),
    onSuccess: (data) => {
      // Invalidate the main endpoint query
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      
      // Invalidate any additional queries specified
      options?.invalidateQueries?.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      });

      toast({
        title: "Deleted",
        description: options?.successMessage || "Successfully deleted",
      });

      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      toast({
        title: "Deletion Failed",
        description: options?.errorMessage || error.message,
        variant: "destructive",
      });

      options?.onError?.(error);
    },
  });
}

/**
 * Reusable hook for BATCH DELETE operations
 * Automatically handles: API request, query invalidation, toast notifications
 * 
 * @example
 * const batchDeleteMutation = useBatchDeleteMutation('/api/sensor-configs', {
 *   successMessage: "Sensor configurations deleted successfully"
 * });
 * // Usage: batchDeleteMutation.mutate(['id1', 'id2', 'id3'])
 */
export function useBatchDeleteMutation<TOutput = any>(
  endpoint: string,
  options?: CrudMutationOptions<TOutput>
): UseMutationResult<TOutput, Error, string[]> {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (ids: string[]) =>
      apiRequest('POST', `${endpoint}/batch-delete`, { ids }),
    onSuccess: (data) => {
      // Invalidate the main endpoint query
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      
      // Invalidate any additional queries specified
      options?.invalidateQueries?.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      });

      toast({
        title: "Deleted",
        description: options?.successMessage || "Successfully deleted items",
      });

      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      toast({
        title: "Deletion Failed",
        description: options?.errorMessage || error.message,
        variant: "destructive",
      });

      options?.onError?.(error);
    },
  });
}

/**
 * Reusable hook for CUSTOM mutations with standard error/success handling
 * Use this for operations that don't fit standard CRUD patterns
 * 
 * @example
 * const approveSignalMutation = useCustomMutation(
 *   (data) => apiRequest('POST', '/api/sensors/approve', data),
 *   '/api/sensors/unknown',
 *   {
 *     successMessage: "Signal approved and mapped successfully",
 *     onSuccess: () => setDialogOpen(false)
 *   }
 * );
 */
export function useCustomMutation<TInput, TOutput = any>(
  mutationFn: (data: TInput) => Promise<TOutput>,
  queryKeyToInvalidate: string | string[],
  options?: CrudMutationOptions<TOutput>
): UseMutationResult<TOutput, Error, TInput> {
  const { toast } = useToast();

  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      // Invalidate specified query keys
      const keys = Array.isArray(queryKeyToInvalidate) 
        ? queryKeyToInvalidate 
        : [queryKeyToInvalidate];
      
      keys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
      
      // Invalidate any additional queries specified
      options?.invalidateQueries?.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      });

      if (options?.successMessage) {
        toast({
          title: "Success",
          description: options.successMessage,
        });
      }

      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: options?.errorMessage || error.message,
        variant: "destructive",
      });

      options?.onError?.(error);
    },
  });
}
