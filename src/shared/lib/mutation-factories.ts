'use client';

import { useQueryClient, type QueryClient, type QueryKey, type UseMutationResult } from '@tanstack/react-query';

import { createMutationV2 } from '@/shared/lib/query-factories-v2';
import { inferLegacyFactoryMeta } from '@/shared/lib/tanstack-factory-meta-inference';
import type { TanstackFactoryDomain } from '@/shared/lib/tanstack-factory-v2.types';
import type { DtoBase } from '@/shared/types/dto-base';

type RobustMutationMeta = {
  mutationKey?: QueryKey | undefined;
  source?: string | undefined;
  resource?: string | undefined;
  domain?: TanstackFactoryDomain | undefined;
  tags?: string[] | undefined;
};

const toRobustMeta = (
  input: {
    operation: 'create' | 'update' | 'delete' | 'action';
    source: string;
  },
  meta: RobustMutationMeta | undefined
) => {
  const inferred = inferLegacyFactoryMeta({
    key: meta?.mutationKey,
    operation: input.operation,
    source: meta?.source ?? input.source,
    kind: 'mutation',
  });
  return {
    ...inferred,
    ...(meta?.resource ? { resource: meta.resource } : {}),
    ...(meta?.domain ? { domain: meta.domain } : {}),
    ...(Array.isArray(meta?.tags) && meta.tags.length > 0
      ? { tags: [...(inferred.tags ?? []), ...meta.tags] }
      : {}),
  };
};

/**
 * Factory for creating standardized save mutations (create or update)
 */
export function createSaveMutation<T extends DtoBase, TVariables = { id?: string; data: unknown }>(
  config: {
    saveFn: (variables: TVariables) => Promise<T>;
    invalidateFn: (queryClient: QueryClient, data: T, variables: TVariables) => void | Promise<void>;
    meta?: RobustMutationMeta | undefined;
  }
): UseMutationResult<T, Error, TVariables> {
  const queryClient = useQueryClient();

  return createMutationV2<T, TVariables>({
    mutationFn: config.saveFn,
    ...(config.meta?.mutationKey ? { mutationKey: config.meta.mutationKey } : {}),
    meta: toRobustMeta(
      { operation: 'action', source: 'legacy.mutation-factories.save' },
      config.meta
    ),
    onSuccess: async (data, variables): Promise<void> => {
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
    meta?: RobustMutationMeta | undefined;
  }
): UseMutationResult<T, Error, TVariables> {
  const queryClient = useQueryClient();

  return createMutationV2<T, TVariables>({
    mutationFn: config.deleteFn,
    ...(config.meta?.mutationKey ? { mutationKey: config.meta.mutationKey } : {}),
    meta: toRobustMeta(
      { operation: 'delete', source: 'legacy.mutation-factories.delete' },
      config.meta
    ),
    onSuccess: async (data, variables): Promise<void> => {
      await config.invalidateFn(queryClient, data, variables);
    },
  });
}

/**
 * Factory for creating standardized create mutations
 */
export function createCreateMutation<T extends DtoBase | Record<string, unknown>, TVariables = unknown>(
  config: {
    createFn: (variables: TVariables) => Promise<T>;
    invalidateFn: (queryClient: QueryClient, data: T, variables: TVariables) => void | Promise<void>;
    meta?: RobustMutationMeta | undefined;
  }
): UseMutationResult<T, Error, TVariables> {
  const queryClient = useQueryClient();

  return createMutationV2<T, TVariables>({
    mutationFn: config.createFn,
    ...(config.meta?.mutationKey ? { mutationKey: config.meta.mutationKey } : {}),
    meta: toRobustMeta(
      { operation: 'create', source: 'legacy.mutation-factories.create' },
      config.meta
    ),
    onSuccess: async (data, variables): Promise<void> => {
      await config.invalidateFn(queryClient, data, variables);
    },
  });
}

/**
 * Factory for creating standardized update mutations
 */
export function createUpdateMutation<T = void, TVariables = { id: string; data: unknown }>(
  config: {
    updateFn: (variables: TVariables) => Promise<T>;
    invalidateFn: (queryClient: QueryClient, data: T, variables: TVariables) => void | Promise<void>;
    meta?: RobustMutationMeta | undefined;
  }
): UseMutationResult<T, Error, TVariables> {
  const queryClient = useQueryClient();

  return createMutationV2<T, TVariables>({
    mutationFn: config.updateFn,
    ...(config.meta?.mutationKey ? { mutationKey: config.meta.mutationKey } : {}),
    meta: toRobustMeta(
      { operation: 'update', source: 'legacy.mutation-factories.update' },
      config.meta
    ),
    onSuccess: async (data, variables): Promise<void> => {
      await config.invalidateFn(queryClient, data, variables);
    },
  });
}
