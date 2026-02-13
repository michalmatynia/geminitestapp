import type { DtoBase } from './base';

/**
 * Standard structure for localized fields across the app
 * Maps language codes (e.g., 'en', 'pl') to their respective translations
 */
export type Localized<T = string> = Record<string, T | null>;

/**
 * Automatically derives a Creation DTO by omitting system-managed fields
 * from the base DTO definition.
 */
export type CreateDto<T extends DtoBase> = Omit<T, keyof DtoBase>;

/**
 * Automatically derives an Update DTO by making creation fields optional.
 */
export type UpdateDto<T extends DtoBase> = Partial<CreateDto<T>>;

/**
 * Standard response wrapper for list queries
 */
export interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Standard response wrapper for paginated queries
 */
export type PagedResponse<T> = ListResponse<T>;

/**
 * Standard mutation input for save operations (create-or-update)
 */
export interface SavePayload<T extends DtoBase> {
  id?: string;
  data: Partial<CreateDto<T>>;
}

/**
 * Standard mutation input for create operations
 */
export type CreatePayload<T extends DtoBase> = CreateDto<T>;

/**
 * Standard mutation input for update operations
 */
export interface UpdatePayload<T extends DtoBase> {
  id: string;
  data: Partial<CreateDto<T>>;
}

/**
 * Standard mutation input for delete operations
 */
export interface DeletePayload {
  id: string;
}

/**
 * Standard API error response
 */
export interface ApiErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp?: string;
  path?: string;
}

/**
 * Standard API success response
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data?: T;
  message?: string;
}

/**
 * Union type for API responses
 */
export type ApiResult<T = unknown> =
  | ApiSuccessResponse<T>
  | { success: false; error: ApiErrorResponse };
