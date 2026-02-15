import { useMutation, useQuery, useQueryClient, type UseQueryOptions, type UseMutationOptions, type QueryKey } from '@tanstack/react-query';

import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import type { ListQuery, SingleQuery, PagedQuery, CreateMutation, UpdateMutation, DeleteMutation, SaveMutation, ListResponse } from '@/shared/types';

export type QueryKeyFactory<TInput = void> = QueryKey | ((input: TInput) => QueryKey);
export type InvalidateKeysFactory<TData = unknown, TInput = unknown> =
  | QueryKey
  | QueryKey[]
  | ((data: TData, input: TInput) => QueryKey | QueryKey[]);

export interface CreateListQueryConfig<T, TInput = void> {
  queryKey: QueryKeyFactory<TInput>;
  queryFn: (input: TInput) => Promise<T[]>;
  options?: Partial<UseQueryOptions<T[]>>;
}

type SimplePagedResult<T> = { items: T[]; total: number; page: number };

export interface CreatePagedQueryConfig<T, TInput = void> {
  queryKey: QueryKeyFactory<TInput>;
  queryFn: (page: number, limit: number, input: TInput) => Promise<SimplePagedResult<T>>;
  options?: Partial<UseQueryOptions<ListResponse<T>>>;
}

export interface CreateSingleQueryConfig<T, TInput = void> {
  queryKey: QueryKeyFactory<TInput>;
  queryFn: (input: TInput) => Promise<T>;
  options?: Partial<UseQueryOptions<T>>;
}

export interface CreateCreateMutationConfig<T, TInput> {
  mutationFn: (input: TInput) => Promise<T>;
  invalidateKeys?: InvalidateKeysFactory<T, TInput>;
  options?: Partial<UseMutationOptions<T, Error, TInput>>;
}

export interface CreateUpdateMutationConfig<T, TInput> {
  mutationFn: (input: TInput) => Promise<T>;
  invalidateKeys?: InvalidateKeysFactory<T, TInput>;
  options?: Partial<UseMutationOptions<T, Error, TInput>>;
}

export interface CreateDeleteMutationConfig {
  mutationFn: (id: string) => Promise<void>;
  invalidateKeys?: InvalidateKeysFactory<void, string>;
  options?: Partial<UseMutationOptions<void, Error, string>>;
}

export interface CreateSaveMutationConfig<T, TInput> {
  mutationFn: (input: TInput) => Promise<T>;
  invalidateKeys?: InvalidateKeysFactory<T, TInput>;
  options?: Partial<UseMutationOptions<T, Error, TInput>>;
}

function mergeOnSuccess<T, TInput>(
  baseOnSuccess: ((data: T, variables: TInput, context: unknown) => void) | undefined,
  customOnSuccess: ((data: T, variables: TInput, context: unknown) => unknown) | undefined,
) {
  return (data: T, variables: TInput, context: unknown) => {
    baseOnSuccess?.(data, variables, context);
    customOnSuccess?.(data, variables, context);
  };
}

function resolveQueryKey<TInput>(factory: QueryKeyFactory<TInput>, input: TInput): QueryKey {
  const resolved = typeof factory === 'function' ? factory(input) : factory;
  return normalizeQueryKey(resolved);
}

function resolveInvalidateKeys<T, TInput>(factory: InvalidateKeysFactory<T, TInput>, data: T, input: TInput): QueryKey[] {
  const resolved = typeof factory === 'function' ? factory(data, input) : factory;
  if (!resolved) return [];
  if (Array.isArray(resolved) && Array.isArray(resolved[0])) {
    return (resolved as unknown[]).map((key) => normalizeQueryKey(key));
  }
  return [normalizeQueryKey(resolved)];
}

export function createListQuery<T, TInput = void>(
  config: CreateListQueryConfig<T, TInput>,
  input: TInput = undefined as TInput
): ListQuery<T> {
  return useQuery({
    queryKey: resolveQueryKey(config.queryKey, input),
    queryFn: () => config.queryFn(input),
    ...config.options,
  });
}

export function createPagedQuery<T, TInput = void>(
  config: CreatePagedQueryConfig<T, TInput>,
  input: TInput = undefined as TInput
): PagedQuery<T> {
  return useQuery({
    queryKey: resolveQueryKey(config.queryKey, input),
    queryFn: async () => {
      const page = 1;
      const limit = 10;
      const result = await config.queryFn(page, limit, input);
      return {
        items: result.items,
        total: result.total,
        page: result.page,
        pageSize: limit,
        hasMore: result.total > result.page * limit,
      };
    },
    ...config.options,
  });
}

export function createSingleQuery<T, TInput = void>(
  config: CreateSingleQueryConfig<T, TInput>,
  input: TInput = undefined as TInput
): SingleQuery<T> {
  return useQuery({
    queryKey: resolveQueryKey(config.queryKey, input),
    queryFn: () => config.queryFn(input),
    ...config.options,
  });
}

export function createCreateMutation<T, TInput>(config: CreateCreateMutationConfig<T, TInput>): CreateMutation<T, TInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: config.mutationFn,
    ...config.options,
    onSuccess: mergeOnSuccess(
      (data: T, variables: TInput) => {
        if (config.invalidateKeys) {
          const keys = resolveInvalidateKeys(config.invalidateKeys, data, variables);
          keys.forEach((key) => {
            void queryClient.invalidateQueries({ queryKey: key });
          });
        }
      },
      config.options?.onSuccess as ((data: T, variables: TInput, context: unknown) => unknown) | undefined,
    ) as (data: T, variables: TInput, context: unknown) => void,
  });
}

export function createUpdateMutation<T, TInput>(config: CreateUpdateMutationConfig<T, TInput>): UpdateMutation<T, TInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: config.mutationFn,
    ...config.options,
    onSuccess: mergeOnSuccess(
      (data: T, variables: TInput) => {
        if (config.invalidateKeys) {
          const keys = resolveInvalidateKeys(config.invalidateKeys, data, variables);
          keys.forEach((key) => {
            void queryClient.invalidateQueries({ queryKey: key });
          });
        }
      },
      config.options?.onSuccess as ((data: T, variables: TInput, context: unknown) => unknown) | undefined,
    ) as (data: T, variables: TInput, context: unknown) => void,
  });
}

export function createDeleteMutation(config: CreateDeleteMutationConfig): DeleteMutation {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: config.mutationFn,
    ...config.options,
    onSuccess: mergeOnSuccess(
      (data: void, variables: string) => {
        if (config.invalidateKeys) {
          const keys = resolveInvalidateKeys(config.invalidateKeys, data, variables);
          keys.forEach((key) => {
            void queryClient.invalidateQueries({ queryKey: key });
          });
        }
      },
      config.options?.onSuccess as ((data: void, variables: string, context: unknown) => unknown) | undefined,
    ) as (data: void, variables: string, context: unknown) => void,
  });
}

export function createSaveMutation<T, TInput>(config: CreateSaveMutationConfig<T, TInput>): SaveMutation<T, TInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: config.mutationFn,
    ...config.options,
    onSuccess: mergeOnSuccess(
      (data: T, variables: TInput) => {
        if (config.invalidateKeys) {
          const keys = resolveInvalidateKeys(config.invalidateKeys, data, variables);
          keys.forEach((key) => {
            void queryClient.invalidateQueries({ queryKey: key });
          });
        }
      },
      config.options?.onSuccess as ((data: T, variables: TInput, context: unknown) => unknown) | undefined,
    ) as (data: T, variables: TInput, context: unknown) => void,
  });
}
