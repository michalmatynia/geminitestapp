import type { ListQuery, MutationResult } from '@/shared/contracts/ui/queries';
import { api } from '@/shared/lib/api-client';
import {
  createCreateMutationV2,
  createDeleteMutationV2,
  createListQueryV2,
  createUpdateMutationV2,
} from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { TanstackFactoryDomain } from '@/shared/lib/tanstack-factory-v2.types';

/**
 * A generic hook to handle standard CRUD operations for a resource
 * integrated with TanStack Query and the internal API client.
 */
export function useResource<T extends { id: string }>(
  resourcePath: string,
  queryKey: readonly unknown[],
  options?: { domain?: TanstackFactoryDomain }
): {
  list: ListQuery<T, T[]>;
  create: MutationResult<T, Partial<T>>;
  update: MutationResult<T, { id: string } & Partial<T>>;
  remove: MutationResult<void, string>;
} {
  const normalizedResourcePath = resourcePath.replace(/^\/+|\/+$/g, '') || 'resource';
  const resourceTag = normalizedResourcePath.replaceAll('/', '.');
  const resourceLabel = normalizedResourcePath.replaceAll('/', ' ');
  const domain = options?.domain ?? 'global';

  // List all items
  const list = createListQueryV2<T, T[]>({
    queryKey,
    queryFn: () => api.get<T[]>(resourcePath),
    staleTime: 0,
    meta: {
      source: 'shared.hooks.query.useResource.list',
      operation: 'list',
      resource: normalizedResourcePath,
      domain,
      tags: ['resource', resourceTag, 'list'],
      description: `Loads records for ${resourceLabel}.`,
    },
  });

  // Create a new item
  const create = createCreateMutationV2<T, Partial<T>>({
    mutationKey: QUERY_KEYS.resources.mutation(normalizedResourcePath, 'create'),
    mutationFn: (data: Partial<T>) => api.post<T>(resourcePath, data),
    invalidateKeys: [queryKey],
    meta: {
      source: 'shared.hooks.query.useResource.create',
      operation: 'create',
      resource: normalizedResourcePath,
      domain,
      tags: ['resource', resourceTag, 'create'],
      description: `Creates a record in ${resourceLabel}.`,
    },
  });

  // Update an existing item
  const update = createUpdateMutationV2<T, { id: string } & Partial<T>>({
    mutationKey: QUERY_KEYS.resources.mutation(normalizedResourcePath, 'update'),
    mutationFn: ({ id, ...data }: { id: string } & Partial<T>) =>
      api.patch<T>(`${resourcePath}/${id}`, data),
    invalidate: (queryClient, updated) => {
      // Optimistically update the list if it exists in cache
      queryClient.setQueryData(queryKey, (old: T[] | undefined) =>
        old?.map((item) => (item.id === updated.id ? updated : item))
      );
      // Also invalidate to be sure
      void queryClient.invalidateQueries({ queryKey });
    },
    meta: {
      source: 'shared.hooks.query.useResource.update',
      operation: 'update',
      resource: normalizedResourcePath,
      domain,
      tags: ['resource', resourceTag, 'update'],
      description: `Updates a record in ${resourceLabel}.`,
    },
  });

  // Delete an item
  const remove = createDeleteMutationV2<void, string>({
    mutationKey: QUERY_KEYS.resources.mutation(normalizedResourcePath, 'delete'),
    mutationFn: (id: string) => api.delete<void>(`${resourcePath}/${id}`),
    invalidate: (queryClient, _, id) => {
      queryClient.setQueryData(queryKey, (old: T[] | undefined) =>
        old?.filter((item) => item.id !== id)
      );
      void queryClient.invalidateQueries({ queryKey });
    },
    meta: {
      source: 'shared.hooks.query.useResource.delete',
      operation: 'delete',
      resource: normalizedResourcePath,
      domain,
      tags: ['resource', resourceTag, 'delete'],
      description: `Deletes a record from ${resourceLabel}.`,
    },
  });

  return { list, create, update, remove };
}
