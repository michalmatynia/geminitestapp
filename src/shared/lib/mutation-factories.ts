'use client';

import { 
  useMutation, 
  useQueryClient, 
  type UseMutationResult, 
  type QueryClient 
} from '@tanstack/react-query';

import type { DtoBase, CreatePayload, UpdatePayload } from '@/shared/types/dto-base';

/**
 * Factory for creating standardized save mutations (create or update)
 */
export function createSaveMutation<T extends DtoBase>(
  saveFn: (id: string | undefined, data: any) => Promise<T>,
  invalidateFn: (queryClient: QueryClient, data: T) => void | Promise<void>
): UseMutationResult<T, Error, { id?: string; data: any }> {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }) => saveFn(id, data),
    onSuccess: async (data) => {
      await invalidateFn(queryClient, data);
    },
  });
}

/**
 * Factory for creating standardized delete mutations
 */
export function createDeleteMutation<T = void, TVariables = string>(
  deleteFn: (variables: TVariables) => Promise<T>,
  invalidateFn: (queryClient: QueryClient, variables: TVariables) => void | Promise<void>
): UseMutationResult<T, Error, TVariables> {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteFn,
    onSuccess: async (_data, variables) => {
      await invalidateFn(queryClient, variables);
    },
  });
}

/**
 * Factory for creating standardized create mutations
 */
export function createCreateMutation<T extends DtoBase>(
  createFn: (data: any) => Promise<T>,
  invalidateFn: (queryClient: QueryClient, data: T) => void | Promise<void>
): UseMutationResult<T, Error, any> {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createFn,
    onSuccess: async (data) => {
      await invalidateFn(queryClient, data);
    },
  });
}
