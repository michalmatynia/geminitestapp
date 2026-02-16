import {
  useQueryClient,
  type QueryClient,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { z } from 'zod';

import { api, type ApiClientOptions } from '@/shared/lib/api-client';
import { createListQuery } from '@/shared/lib/query-factories';
import { createMutationV2 } from '@/shared/lib/query-factories-v2';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import { inferLegacyFactoryMeta } from '@/shared/lib/tanstack-factory-meta-inference';

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

const resolveEndpoint = <TParams>(
  endpoint: string | ((params: TParams) => string),
  params: TParams
): string => (typeof endpoint === 'function' ? endpoint(params) : endpoint);

const toParamsRecord = (params: unknown): Record<string, string | number | boolean | undefined> | null => {
  if (!params || typeof params !== 'object') return null;
  return params as Record<string, string | number | boolean | undefined>;
};

const methodToMutationOperation = (method: HttpMethod): 'create' | 'update' | 'delete' =>
  method === 'POST' ? 'create' : method === 'DELETE' ? 'delete' : 'update';

const endpointToResource = (endpoint: string | ((...args: never[]) => string)): string => {
  if (typeof endpoint !== 'string') return 'dynamic-endpoint';
  const trimmed = endpoint.trim();
  if (trimmed.length === 0) return 'unknown-endpoint';
  return trimmed
    .replace(/^\/+/, '')
    .replace(/^api\//, '')
    .replaceAll('/', '.');
};

export function createQueryHook<TData, TParams = void>(config: QueryConfig<TData, TParams>) {
  return (
    params: TParams,
    options?: Partial<Omit<UseQueryOptions<TData, Error, TData, QueryKey>, 'queryKey' | 'queryFn'>>
  ) => {
    const queryKey = normalizeQueryKey(config.queryKeyFactory(params));
    return createListQuery<TData, TData>({
      queryKey,
      queryFn: async ({ signal }): Promise<TData> => {
        const url = resolveEndpoint(config.endpoint, params);
        const method = config.apiOptions?.method ?? 'GET';
        const requestOptions: ApiClientOptions = { ...config.apiOptions, signal };

        let data: TData;
        if (method === 'POST') {
          data = await api.post<TData>(url, params as Record<string, unknown>, requestOptions);
        } else {
          const paramsRecord = toParamsRecord(params);
          if (paramsRecord) {
            requestOptions.params = paramsRecord;
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
      ...(options ?? {}),
    });
  };
}

export interface MutationMetaConfig {
  mutationKey?: QueryKey | undefined;
  source?: string | undefined;
  resource?: string | undefined;
  operation?: 'create' | 'update' | 'delete' | 'action' | undefined;
  tags?: string[] | undefined;
}

export interface MutationConfig<TData, TVariables, TContext = unknown> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables, context: TContext, queryClient: QueryClient) => void | Promise<void>;
  invalidateKeys?: QueryKey[] | ((data: TData, variables: TVariables) => QueryKey[]);
  meta?: MutationMetaConfig | undefined;
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
    const { onSuccess: onSuccessOverride, ...mutationOptions } = options ?? {};
    const resolvedMutationKey = mutationOptions.mutationKey ?? config.meta?.mutationKey;
    const inferredMeta = inferLegacyFactoryMeta({
      key: resolvedMutationKey,
      operation: config.meta?.operation ?? 'action',
      source: config.meta?.source ?? 'api-hooks.mutation',
      kind: 'mutation',
    });
    const mutationOptionsWithError = mutationOptions as Omit<
      UseMutationOptions<TData, Error, TVariables, TContext>,
      'mutationFn' | 'onSuccess' | 'meta'
    >;

    return createMutationV2<TData, TVariables, TContext>({
      mutationFn: config.mutationFn,
      ...mutationOptionsWithError,
      ...(resolvedMutationKey ? { mutationKey: resolvedMutationKey } : {}),
      meta: {
        ...inferredMeta,
        ...(config.meta?.resource ? { resource: config.meta.resource } : {}),
        ...(Array.isArray(config.meta?.tags) && config.meta.tags.length > 0
          ? { tags: [...(inferredMeta.tags ?? []), ...config.meta.tags] }
          : {}),
      },
      onSuccess: async (data, variables, context): Promise<void> => {
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
          await config.onSuccess(data, variables, context, queryClient);
        }

        if (onSuccessOverride) {
          await onSuccessOverride(data, variables, context, queryClient);
        }
      },
    }) as unknown as UseMutationResult<TData, TError, TVariables, TContext>;
  };
}

/**
 * Factory for creating typed and validated TanStack Mutation hooks based on API endpoints.
 */
export interface MutationEndpointConfig<TData, TVariables, TContext = unknown> {
  endpoint: string | ((variables: TVariables) => string);
  responseSchema?: z.ZodType<TData>;
  apiOptions?: ApiClientOptions;
  invalidateKeys?: QueryKey[] | ((data: TData, variables: TVariables) => QueryKey[]);
  onSuccess?: (data: TData, variables: TVariables, context: TContext, queryClient: QueryClient) => void | Promise<void>;
}

type HttpMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

function createEndpointMutation<TData, TVariables, TError = Error, TContext = unknown>(
  method: HttpMethod,
  config: MutationEndpointConfig<TData, TVariables, TContext>
): (
  options?: Partial<UseMutationOptions<TData, TError, TVariables, TContext>> & {
    onSuccess?: (data: TData, variables: TVariables, context: TContext, queryClient: QueryClient) => void | Promise<void>;
  }
) => UseMutationResult<TData, TError, TVariables, TContext> {
  const mutationConfig: MutationConfig<TData, TVariables, TContext> = {
    mutationFn: async (variables) => {
      const url = resolveEndpoint(config.endpoint, variables);
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
    ...(config.onSuccess ? { onSuccess: config.onSuccess } : {}),
    ...(config.invalidateKeys ? { invalidateKeys: config.invalidateKeys } : {}),
    meta: {
      operation: methodToMutationOperation(method),
      source: `api-hooks.endpoint.${method.toLowerCase()}`,
      resource: endpointToResource(config.endpoint as string | ((...args: never[]) => string)),
      tags: ['api-hooks', method.toLowerCase()],
    },
  };

  return createMutationHook<TData, TVariables, TContext, TError>(mutationConfig);
}

export function createPostMutation<TData, TVariables, TError = Error, TContext = unknown>(
  config: MutationEndpointConfig<TData, TVariables, TContext>
): (
  options?: Partial<UseMutationOptions<TData, TError, TVariables, TContext>> & {
    onSuccess?: (data: TData, variables: TVariables, context: TContext, queryClient: QueryClient) => void | Promise<void>;
  }
) => UseMutationResult<TData, TError, TVariables, TContext> {
  return createEndpointMutation<TData, TVariables, TError, TContext>('POST', config);
}

export function createPutMutation<TData, TVariables, TError = Error, TContext = unknown>(
  config: MutationEndpointConfig<TData, TVariables, TContext>
): (
  options?: Partial<UseMutationOptions<TData, TError, TVariables, TContext>> & {
    onSuccess?: (data: TData, variables: TVariables, context: TContext, queryClient: QueryClient) => void | Promise<void>;
  }
) => UseMutationResult<TData, TError, TVariables, TContext> {
  return createEndpointMutation<TData, TVariables, TError, TContext>('PUT', config);
}

export function createPatchMutation<TData, TVariables, TError = Error, TContext = unknown>(
  config: MutationEndpointConfig<TData, TVariables, TContext>
): (
  options?: Partial<UseMutationOptions<TData, TError, TVariables, TContext>> & {
    onSuccess?: (data: TData, variables: TVariables, context: TContext, queryClient: QueryClient) => void | Promise<void>;
  }
) => UseMutationResult<TData, TError, TVariables, TContext> {
  return createEndpointMutation<TData, TVariables, TError, TContext>('PATCH', config);
}

export function createDeleteMutation<TData, TVariables, TError = Error, TContext = unknown>(
  config: MutationEndpointConfig<TData, TVariables, TContext>
): (
  options?: Partial<UseMutationOptions<TData, TError, TVariables, TContext>> & {
    onSuccess?: (data: TData, variables: TVariables, context: TContext, queryClient: QueryClient) => void | Promise<void>;
  }
) => UseMutationResult<TData, TError, TVariables, TContext> {
  return createEndpointMutation<TData, TVariables, TError, TContext>('DELETE', config);
}

export function createSaveMutation<TData, TVariables extends { id?: string | number }, TError = Error, TContext = unknown>(
  config: Omit<MutationEndpointConfig<TData, TVariables, TContext>, 'endpoint'> & {
    createEndpoint: string | ((variables: TVariables) => string);
    updateEndpoint: string | ((variables: TVariables) => string);
    updateMethod?: 'POST' | 'PUT' | 'PATCH';
  }
): (
  options?: Partial<UseMutationOptions<TData, TError, TVariables, TContext>> & {
    onSuccess?: (data: TData, variables: TVariables, context: TContext, queryClient: QueryClient) => void | Promise<void>;
  }
) => UseMutationResult<TData, TError, TVariables, TContext> {
  const mutationConfig: MutationConfig<TData, TVariables, TContext> = {
    mutationFn: async (variables) => {
      let data: TData;
      if (variables.id) {
        const url = resolveEndpoint(config.updateEndpoint, variables);
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
        const url = resolveEndpoint(config.createEndpoint, variables);
        data = await api.post<TData>(url, variables, config.apiOptions);
      }

      if (config.responseSchema) {
        return config.responseSchema.parse(data);
      }
      return data;
    },
    ...(config.onSuccess ? { onSuccess: config.onSuccess } : {}),
    ...(config.invalidateKeys ? { invalidateKeys: config.invalidateKeys } : {}),
    meta: {
      operation: 'action',
      source: 'api-hooks.save',
      resource: 'save-mutation',
      tags: ['api-hooks', 'save'],
    },
  };

  return createMutationHook<TData, TVariables, TContext, TError>(mutationConfig);
}
