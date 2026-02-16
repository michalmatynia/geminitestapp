import { useQueryClient, type QueryClient, type QueryKey, type UseMutationResult } from '@tanstack/react-query';
import { useCallback } from 'react';

import { createMutationV2 } from '@/shared/lib/query-factories-v2';
import { inferLegacyFactoryMeta } from '@/shared/lib/tanstack-factory-meta-inference';
import { useToast } from '@/shared/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

interface QueuedMutation {
  id: string;
  mutationFn: () => Promise<unknown>;
  queryKey: readonly unknown[];
  optimisticUpdate?: ((oldData: unknown) => unknown) | undefined;
  invalidateKeys?: (readonly (readonly unknown[])[]) | undefined;
  onProcessed?: (() => void) | undefined;
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
        if (mutation.invalidateKeys) {
          mutation.invalidateKeys.forEach((key: readonly unknown[]) => {
            void queryClient.invalidateQueries({ queryKey: key });
          });
        }
        mutation.onProcessed?.();
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
      const payload = this.queue.map(({ mutationFn: _, onProcessed: __, ...rest }: QueuedMutation) => rest);
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
          this.queue = parsed.filter((item: QueuedMutation): boolean => typeof item?.mutationFn === 'function');        } catch {
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
    extraInvalidateKeys?: readonly (readonly unknown[])[] | ((variables: TVariables) => readonly (readonly unknown[])[]);
    optimisticUpdate?: (oldData: TContext | undefined, variables: TVariables) => TContext;
    successMessage?: string;
    errorMessage?: string;
    queuedMessage?: string;
    processedMessage?: string;
    onQueued?: (variables: TVariables) => void;
    onProcessed?: (variables: TVariables) => void;
  }
): UseMutationResult<TData, TError, TVariables, TContext> {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const mutationKey: QueryKey = options.queryKey;
  const resolveExtraKeys = useCallback(
    (variables: TVariables): readonly (readonly unknown[])[] => {
      if (!options.extraInvalidateKeys) return [];
      return typeof options.extraInvalidateKeys === 'function'
        ? options.extraInvalidateKeys(variables)
        : options.extraInvalidateKeys;
    },
    [options]
  );

  return createMutationV2<TData, TVariables, TContext>({
    mutationKey,
    meta: inferLegacyFactoryMeta({
      key: mutationKey,
      operation: 'action',
      source: 'shared.hooks.offline.useOfflineMutation',
      kind: 'mutation',
    }),
    mutationFn: async (variables: TVariables): Promise<TData> => {
      const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine;
      if (!isOnline) {
        const extraKeys = resolveExtraKeys(variables);
        options.onQueued?.(variables);
        // Queue for later execution
        const queuedMutation: QueuedMutation = {
          id: Date.now().toString(),
          mutationFn: (): Promise<TData> => mutationFn(variables),
          queryKey: options.queryKey,
          invalidateKeys: extraKeys,
          onProcessed: (): void => {
            if (options.processedMessage) {
              toast(options.processedMessage, { variant: 'success' });
            }
            options.onProcessed?.(variables);
          },
          timestamp: Date.now(),
        };
        
        mutationQueue.add(queuedMutation);
        
        // Apply optimistic update
        if (options.optimisticUpdate) {
          queryClient.setQueryData(options.queryKey, (old: TContext | undefined) => 
            options.optimisticUpdate!(old, variables)
          );
        }
        
        toast(options.queuedMessage || 'Changes saved offline. Will sync when online.', { variant: 'info' });
        return null as TData;
      }
      
      return mutationFn(variables);
    },
    onSuccess: (_data: TData, variables: TVariables): void => {
      const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine;
      if (isOnline && options.successMessage) {
        toast(options.successMessage, { variant: 'success' });
      }
      if (!isOnline) return;
      void queryClient.invalidateQueries({ queryKey: options.queryKey });
      const extraKeys = resolveExtraKeys(variables);
      extraKeys.forEach((key: readonly unknown[]) => {
        void queryClient.invalidateQueries({ queryKey: key });
      });
    },
    onError: (error: Error): void => {
      let message = options.errorMessage || 'An error occurred';
      if (error instanceof Error) {
        message = options.errorMessage 
          ? `${options.errorMessage}: ${error.message}`
          : error.message;
      }
      toast(message, { variant: 'error' });
    },
  }) as unknown as UseMutationResult<TData, TError, TVariables, TContext>;
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
