import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import type { ListResponse, IdDataDto, OptionalIdDataDto } from './base';

/**
 * Standard TanStack Query result types
 */

export type ListQuery<T, TResponse = T[]> = UseQueryResult<TResponse, Error>;
export type SingleQuery<T> = UseQueryResult<T, Error>;
export type PagedQuery<T> = UseQueryResult<ListResponse<T>, Error>;

export type MutationResult<TResponse, TInput, TError = Error> = UseMutationResult<
  TResponse,
  TError,
  TInput
>;

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
