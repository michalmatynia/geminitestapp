import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
  type QueryKey,
  type QueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { z } from 'zod';

import { api, type ApiClientOptions } from './api-client';
import { normalizeQueryKey } from './query-key-utils';

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
      queryKey: normalizeQueryKey(config.queryKeyFactory(params)),
      queryFn: async ({ signal }) => {
        const url = typeof config.endpoint === 'function' ? config.endpoint(params) : config.endpoint;
        const method = config.apiOptions?.method ?? 'GET';
        const requestOptions: ApiClientOptions = { ...config.apiOptions, signal };

        let data: TData;
        if (method === 'POST') {
          data = await api.post<TData>(url, params as Record<string, unknown>, requestOptions);
        } else {
          if (params && typeof params === 'object') {
            requestOptions.params = params as Record<string, string | number | boolean | undefined>;
          }
          data = await api.get<TData>(url, requestOptions);
        }
        
        if (config.schema) {
          return config.schema.parse(data);
        }
        return data;
      },
      ...(config.staleTime !== undefined ? { staleTime: config.staleTime } : {}),
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      ...options,
    });
  };
}

export interface MutationConfig<TData, TVariables, TContext = unknown> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables, context: TContext, queryClient: QueryClient) => void | Promise<void>;
  invalidateKeys?: QueryKey[] | ((data: TData, variables: TVariables) => QueryKey[]);
}

export function createMutationHook<TData, TVariables, TContext = unknown, TError = Error>(
  config: MutationConfig<TData, TVariables, TContext>
) {
  return (
    options?: Partial<UseMutationOptions<TData, TError, TVariables, TContext>> & {
      onSuccess?: (data: TData, variables: TVariables, context: TContext, queryClient: QueryClient) => void | Promise<void>;
    }
  ): UseMutationResult<TData, TError, TVariables, TContext> => {
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
            keys.map((key) =>
              queryClient.invalidateQueries({ queryKey: normalizeQueryKey(key) })
            )
          );
        }

        if (config.onSuccess) {
          await (config.onSuccess as (data: TData, variables: TVariables, context: TContext, queryClient: QueryClient) => Promise<void>)(data, variables, context, queryClient);
        }

        if (onSuccess) {
          await (onSuccess as (data: TData, variables: TVariables, context: TContext, queryClient: QueryClient) => Promise<void>)(data, variables, context, queryClient);
        }
      },
      ...mutationOptions,
    });
  };
}

/**
 * Factory for creating typed and validated TanStack Mutation hooks based on API endpoints.
 */
export interface MutationEndpointConfig<TData, TVariables, TError = Error, TContext = unknown> {
  endpoint: string | ((variables: TVariables) => string);
  responseSchema?: z.ZodType<TData>;
  apiOptions?: ApiClientOptions;
  invalidateKeys?: QueryKey[] | ((data: TData, variables: TVariables) => QueryKey[]);
  onSuccess?: (data: TData, variables: TVariables, context: TContext, queryClient: QueryClient) => void | Promise<void>;
}

type HttpMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

function createEndpointMutation<TData, TVariables, TError = Error, TContext = unknown>(
  method: HttpMethod,
  config: MutationEndpointConfig<TData, TVariables, TError, TContext>
): (
  options?: Partial<UseMutationOptions<TData, TError, TVariables, TContext>> & {
    onSuccess?: (data: TData, variables: TVariables, context: TContext, queryClient: QueryClient) => void | Promise<void>;
  }
) => UseMutationResult<TData, TError, TVariables, TContext> {
  return createMutationHook<TData, TVariables, TContext, TError>({
    mutationFn: async (variables) => {
      const url = typeof config.endpoint === 'function' ? config.endpoint(variables) : config.endpoint;
      let data: TData;

      switch (method) {
        case 'POST':
          data = await api.post<TData>(url, variables, config.apiOptions);
          break;
        case 'PUT':
          data = await api.put<TData>(url, variables, config.apiOptions);
          break;
        case 'PATCH':
          data = await api.patch<TData>(url, variables, config.apiOptions);
          break;
        case 'DELETE':
          data = await api.delete<TData>(url, config.apiOptions);
          break;
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }

      if (config.responseSchema) {
        return config.responseSchema.parse(data);
      }
      return data;
    },
    onSuccess: config.onSuccess,
    invalidateKeys: config.invalidateKeys,
  });
}

export function createPostMutation<TData, TVariables, TError = Error, TContext = unknown>(
  config: MutationEndpointConfig<TData, TVariables, TError, TContext>
): (
  options?: Partial<UseMutationOptions<TData, TError, TVariables, TContext>> & {
    onSuccess?: (data: TData, variables: TVariables, context: TContext, queryClient: QueryClient) => void | Promise<void>;
  }
) => UseMutationResult<TData, TError, TVariables, TContext> {
  return createEndpointMutation<TData, TVariables, TError, TContext>('POST', config);
}

export function createPutMutation<TData, TVariables, TError = Error, TContext = unknown>(
  config: MutationEndpointConfig<TData, TVariables, TError, TContext>
): (
  options?: Partial<UseMutationOptions<TData, TError, TVariables, TContext>> & {
    onSuccess?: (data: TData, variables: TVariables, context: TContext, queryClient: QueryClient) => void | Promise<void>;
  }
) => UseMutationResult<TData, TError, TVariables, TContext> {
  return createEndpointMutation<TData, TVariables, TError, TContext>('PUT', config);
}

export function createPatchMutation<TData, TVariables, TError = Error, TContext = unknown>(
  config: MutationEndpointConfig<TData, TVariables, TError, TContext>
): (
  options?: Partial<UseMutationOptions<TData, TError, TVariables, TContext>> & {
    onSuccess?: (data: TData, variables: TVariables, context: TContext, queryClient: QueryClient) => void | Promise<void>;
  }
) => UseMutationResult<TData, TError, TVariables, TContext> {
  return createEndpointMutation<TData, TVariables, TError, TContext>('PATCH', config);
}

export function createDeleteMutation<TData, TVariables, TError = Error, TContext = unknown>(
  config: MutationEndpointConfig<TData, TVariables, TError, TContext>
): (
  options?: Partial<UseMutationOptions<TData, TError, TVariables, TContext>> & {
    onSuccess?: (data: TData, variables: TVariables, context: TContext, queryClient: QueryClient) => void | Promise<void>;
  }
) => UseMutationResult<TData, TError, TVariables, TContext> {
  return createEndpointMutation<TData, TVariables, TError, TContext>('DELETE', config);
}

export function createSaveMutation<TData, TVariables extends { id?: string | number }, TError = Error, TContext = unknown>(
  config: Omit<MutationEndpointConfig<TData, TVariables, TError, TContext>, 'endpoint'> & {
    createEndpoint: string | ((variables: TVariables) => string);
    updateEndpoint: string | ((variables: TVariables) => string);
    updateMethod?: 'POST' | 'PUT' | 'PATCH';
  }
): (
  options?: Partial<UseMutationOptions<TData, TError, TVariables, TContext>> & {
    onSuccess?: (data: TData, variables: TVariables, context: TContext, queryClient: QueryClient) => void | Promise<void>;
  }
) => UseMutationResult<TData, TError, TVariables, TContext> {
  return createMutationHook<TData, TVariables, TContext, TError>({
    mutationFn: async (variables) => {
      let data: TData;
      if (variables.id) {
        const url = typeof config.updateEndpoint === 'function' ? config.updateEndpoint(variables) : config.updateEndpoint;
        const method = config.updateMethod ?? 'PATCH';
        
        switch (method) {
          case 'POST':
            data = await api.post<TData>(url, variables, config.apiOptions);
            break;
          case 'PUT':
            data = await api.put<TData>(url, variables, config.apiOptions);
            break;
          case 'PATCH':
          default:
            data = await api.patch<TData>(url, variables, config.apiOptions);
            break;
        }
      } else {
        const url = typeof config.createEndpoint === 'function' ? config.createEndpoint(variables) : config.createEndpoint;
        data = await api.post<TData>(url, variables, config.apiOptions);
      }

      if (config.responseSchema) {
        return config.responseSchema.parse(data);
      }
      return data;
    },
    onSuccess: config.onSuccess,
    invalidateKeys: config.invalidateKeys,
  });
}





