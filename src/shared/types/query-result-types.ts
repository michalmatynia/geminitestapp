/**
 * Standard TanStack Query result types
 * 
 * These types provide consistent naming across the codebase for query results.
 * They replace repetitive UseQueryResult<T[], Error> annotations with meaningful aliases.
 */

import type { ListResponse } from './dto-utils';
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';

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
export type ListQuery<T, TResponse = T[]> = UseQueryResult<TResponse, Error>;

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
export type CreateMutation<T, TInput = Omit<T, 'id' | 'createdAt' | 'updatedAt'>> = UseMutationResult<T, Error, TInput>;

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
export type UpdateMutation<T, TInput = { id: string; data: Partial<T> }> = UseMutationResult<T, Error, TInput>;

/**
 * Standard result type for delete mutations (legacy void return)
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
 * Modern result type for delete mutations that may return data
 */
export type DeleteMutationResult<TResponse = void, TInput = string> = UseMutationResult<TResponse, Error, TInput>;

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
export type SaveMutation<T, TInput = { id?: string; data: Partial<T> }> = UseMutationResult<T, Error, TInput>;

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
