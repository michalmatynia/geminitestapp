'use client';

import { 
  useMutation, 
  useQueryClient, 
  type UseMutationResult, 
  type QueryClient 
} from '@tanstack/react-query';

import type { DtoBase } from '@/shared/types/dto-base';

/**
 * Factory for creating standardized save mutations (create or update)
 */
export function createSaveMutation<T extends DtoBase, TVariables = { id?: string; data: unknown }>(
  config: {
    saveFn: (variables: TVariables) => Promise<T>;
    invalidateFn: (queryClient: QueryClient, data: T, variables: TVariables) => void | Promise<void>;
  }
): UseMutationResult<T, Error, TVariables> {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: config.saveFn,
    onSuccess: async (data, variables) => {
      await config.invalidateFn(queryClient, data, variables);
    },
  });
}

/**
 * Factory for creating standardized delete mutations
 */
export function createDeleteMutation<T = void, TVariables = string>(
  config: {
    deleteFn: (variables: TVariables) => Promise<T>;
    invalidateFn: (queryClient: QueryClient, data: T, variables: TVariables) => void | Promise<void>;
  }
): UseMutationResult<T, Error, TVariables> {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: config.deleteFn,
    onSuccess: async (data, variables) => {
      await config.invalidateFn(queryClient, data, variables);
    },
  });
}

/**
 * Factory for creating standardized create mutations
 */
export function createCreateMutation<T extends DtoBase, TVariables = unknown>(
  config: {
    createFn: (variables: TVariables) => Promise<T>;
    invalidateFn: (queryClient: QueryClient, data: T, variables: TVariables) => void | Promise<void>;
  }
): UseMutationResult<T, Error, TVariables> {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: config.createFn,
    onSuccess: async (data, variables) => {
      await config.invalidateFn(queryClient, data, variables);
    },
  });
}
