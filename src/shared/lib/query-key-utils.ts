import type { QueryKey } from '@tanstack/react-query';

/**
 * TanStack Query v4+ requires array query keys.
 * Guard at runtime to prevent legacy string/object keys from leaking in.
 */
export function normalizeQueryKey(queryKey: unknown): QueryKey {
  return Array.isArray(queryKey) ? (queryKey as QueryKey) : [queryKey];
}
