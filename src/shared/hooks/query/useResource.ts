import { useQuery, useMutation, useQueryClient, type UseQueryResult, type UseMutationResult } from '@tanstack/react-query';

import { api } from '@/shared/lib/api-client';
import { DtoBase } from '@/shared/types/base';

/**
 * A generic hook to handle standard CRUD operations for a resource
 * integrated with TanStack Query and the internal API client.
 */
export function useResource<T extends DtoBase>(
  resourcePath: string,
  queryKey: unknown[]
): {
  list: UseQueryResult<T[], Error>;
  create: UseMutationResult<T, Error, Partial<T>>;
  update: UseMutationResult<T, Error, { id: string } & Partial<T>>;
  remove: UseMutationResult<void, Error, string>;
} {
  const queryClient = useQueryClient();

  // List all items
  const list = useQuery({
    queryKey,
    queryFn: () => api.get<T[]>(resourcePath),
  });

  // Create a new item
  const create = useMutation({
    mutationFn: (data: Partial<T>) => api.post<T>(resourcePath, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  // Update an existing item
  const update = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<T>) =>
      api.patch<T>(`${resourcePath}/${id}`, data),
    onSuccess: (updated) => {
      // Optimistically update the list if it exists in cache
      queryClient.setQueryData(queryKey, (old: T[] | undefined) =>
        old?.map((item) => (item.id === updated.id ? updated : item))
      );
      // Also invalidate to be sure
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  // Delete an item
  const remove = useMutation({
    mutationFn: (id: string) => api.delete<void>(`${resourcePath}/${id}`),
    onSuccess: (_, id) => {
      queryClient.setQueryData(queryKey, (old: T[] | undefined) =>
        old?.filter((item) => item.id !== id)
      );
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  return { list, create, update, remove };
}
