'use client';

import {
  useQueryClient,
  type QueryClient,
  type QueryKey,
  type UseMutationResult,
} from '@tanstack/react-query';
import { useCallback } from 'react';

import { createMutationV2 } from '@/shared/lib/query-factories-v2';
import { useToast } from '@/shared/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import type { TanstackFactoryMeta } from '@/shared/lib/tanstack-factory-v2.types';

interface QueuedMutation {
  id: string;
  mutationFn: () => Promise<unknown>;
  queryKey: readonly unknown[];
  optimisticUpdate?: ((oldData: unknown) => unknown) | undefined;
  invalidateKeys?: readonly (readonly unknown[])[] | undefined;
  onProcessed?: ((context: { queryClient: QueryClient }) => void) | undefined;
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
        mutation.onProcessed?.({ queryClient });
      } catch (error) {
        logClientError(error, {
          context: {
            source: 'offline-queue',
            mutationId: mutation.id,
            queryKey: mutation.queryKey,
          },
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
      const payload = this.queue.map(
        ({ mutationFn: _, onProcessed: __, ...rest }: QueuedMutation) => rest
      );
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
          const parsed = JSON.parse(stored) as QueuedMutation[];
          this.queue = parsed.filter(
            (item: QueuedMutation): boolean => typeof item?.mutationFn === 'function'
          );
        } catch {
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

/**
 * Standalone function to clear the queue, used by useOfflineQueueStatus
 */
export function clearOfflineMutationQueue(): void {
  mutationQueue.clear();
}

/**
 * Standalone function to process the queue
 */
export async function processOfflineMutationQueue(queryClient: QueryClient): Promise<void> {
  mutationQueue.loadFromStorage();
  await mutationQueue.processQueue(queryClient);
}

export function useOfflineMutation<
  TData,
  TError extends Error = Error,
  TVariables = void,
  TContext = unknown,
>(
  mutationFn: (variables: TVariables, context: { queryClient: QueryClient }) => Promise<TData>,
  options: {
    queryKey: readonly unknown[];
    meta?: Partial<TanstackFactoryMeta>;
    extraInvalidateKeys?:
      | readonly (readonly unknown[])[]
      | ((variables: TVariables) => readonly (readonly unknown[])[]);
    invalidate?: (
      queryClient: QueryClient,
      data: TData,
      variables: TVariables,
      context: TContext | undefined
    ) => Promise<void> | void;
    optimisticUpdate?: (oldData: TContext | undefined, variables: TVariables) => TContext;
    successMessage?: string;
    errorMessage?: string;
    queuedMessage?: string;
    processedMessage?: string;
    onQueued?: (variables: TVariables, context: { queryClient: QueryClient }) => void;
    onProcessed?: (variables: TVariables, context: { queryClient: QueryClient }) => void;
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

  const defaultMeta: TanstackFactoryMeta = {
    source: 'shared.hooks.offline.useOfflineMutation',
    operation: 'action',
    resource: 'offline-mutation',
    domain: 'global',
    samplingRate: 0.4,
    tags: ['shared-hook', 'offline'],
  };

  const mutation = createMutationV2<TData, TVariables, TContext, TError>({
    mutationKey,
    meta: {
      ...defaultMeta,
      ...options.meta,
      operation: 'action',
      domain: 'global',
      queryKey: options.queryKey,
    },
    mutationFn: async (variables: TVariables): Promise<TData> => {
      const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine;
      if (!isOnline) {
        const extraKeys = resolveExtraKeys(variables);
        options.onQueued?.(variables, { queryClient });
        mutationQueue.add({
          id: Math.random().toString(36).slice(2, 9),
          mutationFn: () => mutationFn(variables, { queryClient }),
          queryKey: options.queryKey,
          invalidateKeys: extraKeys,
          onProcessed: () => options.onProcessed?.(variables, { queryClient }),
          timestamp: Date.now(),
        });

        if (options.optimisticUpdate) {
          queryClient.setQueryData(options.queryKey, (old: TContext | undefined) =>
            options.optimisticUpdate!(old, variables)
          );
        }

        toast(options.queuedMessage || 'Changes saved offline. Will sync when online.', {
          variant: 'info',
        });
        return null as unknown as TData;
      }

      return mutationFn(variables, { queryClient });
    },
    onSuccess: async (data: TData, variables: TVariables, context): Promise<void> => {
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

      if (options.invalidate) {
        await options.invalidate(queryClient, data, variables, context);
      }
    },
    onError: (error: Error): void => {
      let message = options.errorMessage || 'An error occurred';
      if (error instanceof Error) {
        message = options.errorMessage || error.message;
      }
      toast(message, { variant: 'error' });
    },
  });

  return mutation as UseMutationResult<TData, TError, TVariables, TContext>;
}

export function useOfflineSync(): {
  processQueue: () => Promise<void>;
  clearQueue: () => void;
  } {
  const queryClient = useQueryClient();

  const processQueue = useCallback(async () => {
    await processOfflineMutationQueue(queryClient);
  }, [queryClient]);

  const clearQueue = useCallback(() => {
    clearOfflineMutationQueue();
  }, []);

  return { processQueue, clearQueue };
}
