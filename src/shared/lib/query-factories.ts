import { useMutation, useQuery, useQueryClient, type UseQueryOptions, type UseMutationOptions } from '@tanstack/react-query';

import type { ListQuery, SingleQuery, PagedQuery, CreateMutation, UpdateMutation, DeleteMutation, SaveMutation, ListResponse } from '@/shared/types';

export interface CreateListQueryConfig<T> {
  queryKey: readonly string[];
  queryFn: () => Promise<T[]>;
  options?: Partial<UseQueryOptions<T[]>>;
}

type SimplePagedResult<T> = { items: T[]; total: number; page: number };

export interface CreatePagedQueryConfig<T> {
  queryKey: readonly string[];
  queryFn: (page: number, limit: number) => Promise<SimplePagedResult<T>>;
  options?: Partial<UseQueryOptions<ListResponse<T>>>;
}

export interface CreateSingleQueryConfig<T> {
  queryKey: readonly string[];
  queryFn: () => Promise<T>;
  options?: Partial<UseQueryOptions<T>>;
}

export interface CreateCreateMutationConfig<T, TInput> {
  mutationFn: (input: TInput) => Promise<T>;
  invalidateKeys?: readonly (readonly string[])[];
  options?: Partial<UseMutationOptions<T, Error, TInput>>;
}

export interface CreateUpdateMutationConfig<T, TInput> {
  mutationFn: (input: TInput) => Promise<T>;
  invalidateKeys?: readonly (readonly string[])[];
  options?: Partial<UseMutationOptions<T, Error, TInput>>;
}

export interface CreateDeleteMutationConfig {
  mutationFn: (id: string) => Promise<void>;
  invalidateKeys?: readonly (readonly string[])[];
  options?: Partial<UseMutationOptions<void, Error, string>>;
}

export interface CreateSaveMutationConfig<T, TInput> {
  mutationFn: (input: TInput) => Promise<T>;
  invalidateKeys?: readonly (readonly string[])[];
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

export function createListQuery<T>(config: CreateListQueryConfig<T>): ListQuery<T> {
  return useQuery({
    queryKey: config.queryKey,
    queryFn: config.queryFn,
    ...config.options,
  });
}

export function createPagedQuery<T>(config: CreatePagedQueryConfig<T>): PagedQuery<T> {
  return useQuery({
    queryKey: config.queryKey,
    queryFn: async () => {
      const page = 1;
      const limit = 10;
      const result = await config.queryFn(page, limit);
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

export function createSingleQuery<T>(config: CreateSingleQueryConfig<T>): SingleQuery<T> {
  return useQuery({
    queryKey: config.queryKey,
    queryFn: config.queryFn,
    ...config.options,
  });
}

export function createCreateMutation<T, TInput>(config: CreateCreateMutationConfig<T, TInput>): CreateMutation<T, TInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: config.mutationFn,
    ...config.options,
    onSuccess: mergeOnSuccess(
      (_data: T, _variables: TInput) => {
        if (config.invalidateKeys) {
          config.invalidateKeys.forEach((key) => {
            void queryClient.invalidateQueries({ queryKey: key as any });
          });
        }
      },
      config.options?.onSuccess as any,
    ) as any,
  });
}

export function createUpdateMutation<T, TInput>(config: CreateUpdateMutationConfig<T, TInput>): UpdateMutation<T, TInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: config.mutationFn,
    ...config.options,
    onSuccess: mergeOnSuccess(
      (_data: T, _variables: TInput) => {
        if (config.invalidateKeys) {
          config.invalidateKeys.forEach((key) => {
            void queryClient.invalidateQueries({ queryKey: key as any });
          });
        }
      },
      config.options?.onSuccess as any,
    ) as any,
  });
}

export function createDeleteMutation(config: CreateDeleteMutationConfig): DeleteMutation {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: config.mutationFn,
    ...config.options,
    onSuccess: mergeOnSuccess(
      () => {
        if (config.invalidateKeys) {
          config.invalidateKeys.forEach((key) => {
            void queryClient.invalidateQueries({ queryKey: key as any });
          });
        }
      },
      config.options?.onSuccess as any,
    ) as any,
  });
}

export function createSaveMutation<T, TInput>(config: CreateSaveMutationConfig<T, TInput>): SaveMutation<T, TInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: config.mutationFn,
    ...config.options,
    onSuccess: mergeOnSuccess(
      (_data: T, _variables: TInput) => {
        if (config.invalidateKeys) {
          config.invalidateKeys.forEach((key) => {
            void queryClient.invalidateQueries({ queryKey: key as any });
          });
        }
      },
      config.options?.onSuccess as any,
    ) as any,
  });
}
