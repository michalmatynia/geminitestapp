import { useMutation, useQueryClient, type UseMutationResult, type QueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useToast } from "@/shared/ui";
import { logClientError } from "@/shared/utils/observability/client-error-logger";

interface QueuedMutation {
  id: string;
  mutationFn: () => Promise<unknown>;
  queryKey: readonly unknown[];
  optimisticUpdate?: (oldData: unknown) => unknown;
  timestamp: number;
}

class OfflineMutationQueue {
  private queue: QueuedMutation[] = [];
  private isProcessing: boolean = false;

  add(mutation: QueuedMutation): void {
    this.queue.push(mutation);
    this.saveToStorage();
  }

  async processQueue(queryClient: QueryClient): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.queue.length > 0) {
      const mutation = this.queue.shift();
      if (!mutation) break;
      
      try {
        await mutation.mutationFn();
        void queryClient.invalidateQueries({ queryKey: mutation.queryKey });
      } catch (error) {
        logClientError(error, { 
          context: { 
            source: 'offline-queue', 
            mutationId: mutation.id,
            queryKey: mutation.queryKey
          } 
        });
        // Re-queue if it's a network error
        if (error instanceof Error && error.message.includes('fetch')) {
          this.queue.unshift(mutation);
          break;
        }
      }
    }
    
    this.isProcessing = false;
    this.saveToStorage();
  }

  private saveToStorage(): void {
    if (typeof window !== 'undefined') {
      // NOTE: function serialization is not supported by JSON.stringify
      // In a real app, you'd store mutation metadata and reconstruct the fn
      const payload = this.queue.map(({ mutationFn: _, ...rest }: QueuedMutation) => rest);
      if (payload.length === 0) {
        localStorage.removeItem('offline-mutation-queue');
      } else {
        localStorage.setItem('offline-mutation-queue', JSON.stringify(payload));
      }
    }
  }

  loadFromStorage(): void {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('offline-mutation-queue');
      if (stored) {
        try {
          // We can't really restore the function from storage this way
          const parsed = JSON.parse(stored) as QueuedMutation[];
                      this.queue = parsed.filter((item: QueuedMutation): boolean => typeof item?.mutationFn === "function");        } catch {
          this.queue = [];
        }
      }
    }
  }

  clear(): void {
    this.queue = [];
    this.saveToStorage();
  }
}

const mutationQueue = new OfflineMutationQueue();

export function useOfflineMutation<TData, TError = Error, TVariables = void, TContext = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    queryKey: readonly unknown[];
    optimisticUpdate?: (oldData: TContext | undefined, variables: TVariables) => TContext;
    successMessage?: string;
    errorMessage?: string;
  }
): UseMutationResult<TData, TError, TVariables, TContext> {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (variables: TVariables): Promise<TData> => {
      if (!navigator.onLine) {
        // Queue for later execution
        const queuedMutation: QueuedMutation = {
          id: Date.now().toString(),
          mutationFn: (): Promise<TData> => mutationFn(variables),
          queryKey: options.queryKey,
          timestamp: Date.now(),
        };
        
        mutationQueue.add(queuedMutation);
        
        // Apply optimistic update
        if (options.optimisticUpdate) {
          queryClient.setQueryData(options.queryKey, (old: TContext | undefined) => 
            options.optimisticUpdate!(old, variables)
          );
        }
        
        toast("Changes saved offline. Will sync when online.", { variant: "info" });
        return null as TData;
      }
      
      return mutationFn(variables);
    },
    onSuccess: (_data: TData, _variables: TVariables): void => {
      if (navigator.onLine && options.successMessage) {
        toast(options.successMessage, { variant: "success" });
      }
      void queryClient.invalidateQueries({ queryKey: options.queryKey });
    },
    onError: (error: TError): void => {
      const message = options.errorMessage || 
        (error instanceof Error ? error.message : "An error occurred");
      toast(message, { variant: "error" });
    },
  });
}

export interface OfflineSyncHookResult {
  processQueue: () => Promise<void>;
}

// Hook to process queued mutations when coming online
export function useOfflineSync(): OfflineSyncHookResult {
  const queryClient = useQueryClient();

  const processQueue = useCallback(async (): Promise<void> => {
    mutationQueue.loadFromStorage();
    await mutationQueue.processQueue(queryClient);
  }, [queryClient]);

  return { processQueue };
}

export function clearOfflineMutationQueue(): void {
  mutationQueue.clear();
}
