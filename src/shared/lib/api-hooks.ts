import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
  type QueryKey,
} from '@tanstack/react-query';
import { z } from 'zod';

import { api, type ApiClientOptions } from './api-client';

/**
 * Factory for creating typed and validated TanStack Query hooks.
 */

export interface QueryConfig<TData, TParams = void> {
  queryKeyFactory: (params: TParams) => QueryKey;
  endpoint: string | ((params: TParams) => string);
  schema?: z.ZodType<TData>;
  apiOptions?: ApiClientOptions & { method?: 'GET' | 'POST' };
  staleTime?: number;
}

export function createQueryHook<TData, TParams = void>(config: QueryConfig<TData, TParams>) {
  return (params: TParams, options?: Partial<UseQueryOptions<TData>>) => {
    return useQuery({
      queryKey: config.queryKeyFactory(params),
      queryFn: async () => {
        const url = typeof config.endpoint === 'function' ? config.endpoint(params) : config.endpoint;
        const method = config.apiOptions?.method ?? 'GET';
        
        let data: TData;
        if (method === 'POST') {
          data = await api.post<TData>(url, params as any, config.apiOptions);
        } else {
          const requestOptions = { ...config.apiOptions };
          if (params && typeof params === 'object') {
            (requestOptions as any).params = params;
          }
          data = await api.get<TData>(url, requestOptions);
        }
        
        if (config.schema) {
          return config.schema.parse(data);
        }
        return data;
      },
      ...(config.staleTime !== undefined ? { staleTime: config.staleTime } : {}),
      ...options,
    });
  };
}

export interface MutationConfig<TData, TVariables, TContext = unknown> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables, context: TContext) => void | Promise<void>;
  invalidateKeys?: QueryKey[] | ((data: TData, variables: TVariables) => QueryKey[]);
}

export function createMutationHook<TData, TVariables, TContext = unknown>(
  config: MutationConfig<TData, TVariables, TContext>
) {
  return (
    options?: Partial<UseMutationOptions<TData, Error, TVariables, TContext>> & {
      onSuccess?: (data: TData, variables: TVariables, context: TContext) => void | Promise<void>;
    }
  ) => {
    const queryClient = useQueryClient();
    const { onSuccess, ...mutationOptions } = options || {};

    return useMutation({
      mutationFn: config.mutationFn,
      onSuccess: async (data, variables, context) => {
        if (config.invalidateKeys) {
          const keys =
            typeof config.invalidateKeys === 'function'
              ? config.invalidateKeys(data, variables)
              : config.invalidateKeys;

          await Promise.all(
            keys.map((key) => queryClient.invalidateQueries({ queryKey: key }))
          );
        }

        if (config.onSuccess) {
          await (config.onSuccess as any)(data, variables, context);
        }

        if (onSuccess) {
          await (onSuccess as any)(data, variables, context);
        }
      },
      ...mutationOptions,
    });
  };
}
