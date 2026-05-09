/**
 * UI Query Contracts
 * 
 * Type definitions for TanStack Query result types and patterns.
 * Provides:
 * - Standard query result type aliases
 * - Mutation result type definitions
 * - Semantic mutation patterns for operations
 * - Delete and update mutation types
 * - Error handling and response patterns
 */

import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import type { ListResponse, IdDataDto, OptionalIdDataDto } from './base';

/** Standard TanStack Query result types for different data patterns */

/** Query result for list operations returning array of items */
export type ListQuery<T, TResponse = T[]> = UseQueryResult<TResponse, Error>;
/** Query result for single item retrieval */
export type SingleQuery<T> = UseQueryResult<T, Error>;
/** Query result for paginated list responses */
export type PagedQuery<T> = UseQueryResult<ListResponse<T>, Error>;

/** Generic mutation result type with response, input, and error types */
export type MutationResult<TResponse, TInput, TError = Error> = UseMutationResult<
  TResponse,
  TError,
  TInput
>;

/** Semantic mutation result for operations with specific patterns */
export type SemanticMutationResult<
  TResponse,
  TInput,
  TKind extends 'create' | 'update' | 'save',
  TError = Error,
> = MutationResult<TResponse, TInput, TError> & {
  readonly __mutationKind?: TKind;
};

export type CreateMutation<
  T,
  TInput = Omit<T, 'id' | 'createdAt' | 'updatedAt'>,
  TError = Error,
> = SemanticMutationResult<T, TInput, 'create', TError>;

export type UpdateMutation<
  T,
  TInput = IdDataDto<Partial<T>>,
  TError = Error,
> = SemanticMutationResult<T, TInput, 'update', TError>;

export type DeleteMutation<TResponse = void, TInput = string, TError = Error> = MutationResult<
  TResponse,
  TInput,
  TError
>;

export type SaveMutation<
  T,
  TInput = OptionalIdDataDto<Partial<T>>,
  TError = Error,
> = SemanticMutationResult<T, TInput, 'save', TError>;

export type VoidMutation<TInput, TError = Error> = MutationResult<void, TInput, TError>;
