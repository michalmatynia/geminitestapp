/**
 * Standard TanStack Query result types
 * 
 * These types provide consistent naming across the codebase for query results.
 * They replace repetitive UseQueryResult<T[], Error> annotations with meaningful aliases.
 */

import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import type { ListResponse } from './dto-utils';

/**
 * Standard result type for list queries
 * 
 * @example
 * ```typescript
 * export function usePriceGroups(): ListQuery<PriceGroup> {
 *   return useQuery({...});
 * }
 * ```
 */
export type ListQuery<T> = UseQueryResult<T[], Error>;

/**
 * Standard result type for single-item queries
 * 
 * @example
 * ```typescript
 * export function useProduct(id: string | null): SingleQuery<Product> {
 *   return useQuery({
 *     enabled: !!id,
 *     ...
 *   });
 * }
 * ```
 */
export type SingleQuery<T> = UseQueryResult<T, Error>;

/**
 * Standard result type for paginated queries
 * 
 * @example
 * ```typescript
 * export function useProducts(page: number): PagedQuery<Product> {
 *   return useQuery({...});
 * }
 * ```
 */
export type PagedQuery<T> = UseQueryResult<ListResponse<T>, Error>;

/**
 * Standard result type for create mutations
 * 
 * @example
 * ```typescript
 * export function useCreateProduct(): CreateMutation<Product> {
 *   return useMutation({...});
 * }
 * ```
 */
export type CreateMutation<T> = UseMutationResult<T, Error, Omit<T, 'id' | 'createdAt' | 'updatedAt'>>;

/**
 * Standard result type for update mutations
 * 
 * @example
 * ```typescript
 * export function useUpdateProduct(): UpdateMutation<Product> {
 *   return useMutation({...});
 * }
 * ```
 */
export type UpdateMutation<T> = UseMutationResult<T, Error, { id: string; data: Partial<T> }>;

/**
 * Standard result type for delete mutations
 * 
 * @example
 * ```typescript
 * export function useDeleteProduct(): DeleteMutation {
 *   return useMutation({...});
 * }
 * ```
 */
export type DeleteMutation = UseMutationResult<void, Error, string>;

/**
 * Standard result type for save mutations (create-or-update)
 * 
 * @example
 * ```typescript
 * export function useSaveProduct(): SaveMutation<Product> {
 *   return useMutation({...});
 * }
 * ```
 */
export type SaveMutation<T> = UseMutationResult<T, Error, { id?: string; data: Partial<T> }>;

/**
 * Generic mutation result type for custom operations
 * 
 * @example
 * ```typescript
 * export function useReorderProducts(): MutationResult<Product[], ReorderPayload> {
 *   return useMutation({...});
 * }
 * ```
 */
export type MutationResult<TResponse, TInput> = UseMutationResult<TResponse, Error, TInput>;

/**
 * Standard result type for void operations (e.g., no response data)
 * 
 * @example
 * ```typescript
 * export function useClearCache(): VoidMutation<ClearCachePayload> {
 *   return useMutation({...});
 * }
 * ```
 */
export type VoidMutation<TInput> = UseMutationResult<void, Error, TInput>;
