import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import type { ListResponse } from './base';

/**
 * Unified modal component prop types
 */

export interface ModalStateProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export interface EntityModalProps<T, TList = T> extends ModalStateProps {
  item?: T | null;
  items?: TList[];
  loading?: boolean;
  defaultId?: string;
  error?: string | null;
}

export interface ModalHeaderProps {
  title: string;
  isLoading?: boolean;
  showClose?: boolean;
  subtitle?: string;
}

export interface ModalFooterProps {
  saveLabel?: string;
  cancelLabel?: string;
  isSaveDisabled?: boolean;
  isLoading?: boolean;
  onSave?: () => void | Promise<void>;
}

export interface ModalContentProps {
  children: React.ReactNode;
  className?: string;
  isLoading?: boolean;
}

export interface SimpleModalProps extends ModalStateProps {
  title: string;
  isLoading?: boolean;
  error?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface MultiSectionModalProps extends ModalStateProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
  error?: string | null;
}

export type ExtractEntityType<T extends EntityModalProps<unknown, unknown>> = T extends EntityModalProps<infer E, unknown> ? E : never;
export type ExtractListItemType<T extends EntityModalProps<unknown, unknown>> = T extends EntityModalProps<unknown, infer L> ? L : never;

/**
 * Standard TanStack Query result types
 */

export type ListQuery<T, TResponse = T[]> = UseQueryResult<TResponse, Error>;
export type SingleQuery<T> = UseQueryResult<T, Error>;
export type PagedQuery<T> = UseQueryResult<ListResponse<T>, Error>;

export type CreateMutation<T, TInput = Omit<T, 'id' | 'createdAt' | 'updatedAt'>> = UseMutationResult<T, Error, TInput>;
export type UpdateMutation<T, TInput = { id: string; data: Partial<T> }> = UseMutationResult<T, Error, TInput>;
export type DeleteMutation<TResponse = void, TInput = string> = UseMutationResult<TResponse, Error, TInput>;
export type SaveMutation<T, TInput = { id?: string; data: Partial<T> }> = UseMutationResult<T, Error, TInput>;
export type MutationResult<TResponse, TInput> = UseMutationResult<TResponse, Error, TInput>;
export type VoidMutation<TInput> = UseMutationResult<void, Error, TInput>;

/**
 * API Handler Types
 */

export interface DeleteResponse {
  success: boolean;
  message?: string;
}

export interface ApiHandlerContext {
  requestId: string;
  startTime: number;
  getElapsedMs: () => number;
  params?: Record<string, string | string[]>;
  body?: unknown;
  query?: unknown;
  userId?: string | null;
  rateLimitHeaders?: Record<string, string>;
}

export interface ApiHandlerOptions {
  requireAuth?: boolean;
  allowedMethods?: string[];
  source: string;
  logSuccess?: boolean;
  successLogLevel?: 'info' | 'warn' | 'error';
  fallbackMessage?: string;
  includeDetails?: boolean;
  cacheControl?: string;
  rateLimitKey?: false | 'api' | 'auth' | 'write' | 'upload' | 'search';
  maxBodyBytes?: number;
  parseJsonBody?: boolean;
  bodySchema?: any; // ZodSchema
  paramsSchema?: any;
  querySchema?: any;
  requireCsrf?: boolean;
}

export type JsonParseResult<T = unknown> =
  | { ok: true; data: T; response?: Response }
  | { ok: false; response: Response; data?: undefined };

export interface ParseJsonOptions {
  maxSize?: number;
  allowEmpty?: boolean;
  logPrefix?: string;
}
