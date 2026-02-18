import type {
  DtoBase as DtoBaseContract,
  NamedDto as NamedDtoContract,
  LocalizedDto,
  ApiErrorDto,
  ApiResponseDto,
  ListResponseDto,
} from '../contracts/base';

/**
 * Base DTO interface for all domain objects
 */
export type DtoBase = DtoBaseContract;

/**
 * Standard structure for localized fields across the app
 * Maps language codes (e.g., 'en', 'pl') to their respective translations
 */
export type Localized<T = string> = Record<string, T | null>;

/**
 * Base interface for named DTOs
 */
export type NamedDto = NamedDtoContract;

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
export type ListResponse<T> = ListResponseDto<T>;

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
export type ApiResponse<T> = ApiResponseDto<T>;

/**
 * Standard API error structure
 */
export type ApiError = ApiErrorDto;
