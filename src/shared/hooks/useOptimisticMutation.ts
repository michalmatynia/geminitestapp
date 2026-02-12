/* eslint-disable */
"use client";

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { useCallback } from "react";

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
  const queryClient = useQueryClient();

  return useMutation<TData, TError, TVariables, { previousData: TCacheData | undefined }>({
    mutationFn,
    onMutate: async (variables: TVariables): Promise<{ previousData: TCacheData | undefined }> => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: config.queryKey });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<TCacheData>(config.queryKey);

      // Optimistically update
      queryClient.setQueryData<TCacheData>(config.queryKey, (old: TCacheData | undefined): TCacheData => 
        config.updateFn(old, variables)
      );

      return { previousData };
    },
    onError: (_err: TError, _variables: TVariables, context: { previousData: TCacheData | undefined } | undefined): void => {
      // Rollback on error if enabled
      if (config.revertOnError !== false && context?.previousData !== undefined) {
        queryClient.setQueryData(config.queryKey, context.previousData);
      }
    },
    onSettled: () => {
      // Always refetch after mutation
      void queryClient.invalidateQueries({ queryKey: config.queryKey });
    },
  });
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
  const executeBatch = useCallback(async (items: TVariables[]): Promise<{
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
  }, [mutationFn, options]);

  return { executeBatch };
}
