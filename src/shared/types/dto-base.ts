/**
 * Base DTO interface for all domain objects
 */
export interface DtoBase {
  id: string;
  createdAt: Date | string;
  updatedAt: Date | string | null;
}

/**
 * Standard structure for localized fields across the app
 * Maps language codes (e.g., 'en', 'pl') to their respective translations
 */
export type Localized<T = string> = Record<string, T | null>;

/**
 * Base interface for named DTOs
 */
export interface NamedDto extends DtoBase {
  name: string;
  description?: string | null;
}

/**
 * Utility type for creating a new entity (omits base fields)
 */
export type CreateDto<T extends DtoBase> = Omit<T, keyof DtoBase>;

/**
 * Utility type for updating an existing entity
 */
export type UpdateDto<T extends DtoBase> = Partial<CreateDto<T>>;

/**
 * Standard paginated list response
 */
export interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages?: number;
  hasMore?: boolean;
}

/**
 * Payload for save operations (create or update)
 */
export interface SavePayload<T extends DtoBase> {
  id?: string;
  data: Partial<CreateDto<T>>;
}

/**
 * Payload for create operations
 */
export type CreatePayload<T extends DtoBase> = CreateDto<T>;

/**
 * Payload for update operations
 */
export interface UpdatePayload<T extends DtoBase> {
  id: string;
  data: Partial<CreateDto<T>>;
}

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

/**
 * Standard API error structure
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp?: string;
  path?: string;
}
