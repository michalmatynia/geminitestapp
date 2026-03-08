'use client';

import { type UseMutationResult } from '@tanstack/react-query';
import { useCallback } from 'react';

import { createOptimisticMutationV2 } from '@/shared/lib/query-factories-v2';

interface OptimisticUpdateConfig<TData, TVariables> {
  queryKey: readonly unknown[];
  updateFn: (oldData: TData | undefined, variables: TVariables) => TData;
  revertOnError?: boolean;
}

// Hook for optimistic updates with automatic rollback on error
export function useOptimisticMutation<TData, TError, TVariables, TCacheData = TData>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  config: OptimisticUpdateConfig<TCacheData, TVariables>
): UseMutationResult<TData, TError, TVariables, { previousData: TCacheData | undefined }> {
  return createOptimisticMutationV2<TData, TVariables, TCacheData>({
    queryKey: config.queryKey,
    updateFn: config.updateFn,
    revertOnError: config.revertOnError,
    mutationFn,
    meta: {
      source: 'shared.hooks.useOptimisticMutation',
      operation: 'update',
      resource: 'optimistic-mutation',
      domain: 'global',
      samplingRate: 0.4,
      tags: ['shared-hook', 'optimistic'],
      description: 'Updates optimistic mutation.'},
  }) as unknown as UseMutationResult<
    TData,
    TError,
    TVariables,
    { previousData: TCacheData | undefined }
  >;
}

// Hook for batch mutations with progress tracking
export function useBatchMutation<TData, TError, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    onProgress?: (completed: number, total: number) => void;
    onBatchComplete?: (results: TData[]) => void;
    onBatchError?: (errors: TError[]) => void;
  }
) {
  const executeBatch = useCallback(
    async (
      items: TVariables[]
    ): Promise<{
      results: TData[];
      errors: TError[];
    }> => {
      const results: TData[] = [];
      const errors: TError[] = [];

      let count = 0;
      for (const item of items) {
        try {
          const result = await mutationFn(item);
          results.push(result);
          count++;
          options?.onProgress?.(count, items.length);
        } catch (error) {
          errors.push(error as TError);
        }
      }

      if (results.length > 0) {
        options?.onBatchComplete?.(results);
      }
      if (errors.length > 0) {
        options?.onBatchError?.(errors);
      }

      return { results, errors };
    },
    [mutationFn, options]
  );

  return { executeBatch };
}
