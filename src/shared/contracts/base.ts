import { z } from 'zod';

/**
 * Foundation schemas used across all contracts
 */

export const statusSchema = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
  'canceled',
]);
export type StatusDto = z.infer<typeof statusSchema>;
export type Status = StatusDto;

export const localizedSchema = z.record(z.string(), z.string().nullable());
export type LocalizedDto = z.infer<typeof localizedSchema>;
export type Localized<T = string> = Record<string, T | null>;

export const dtoBaseSchema = z.object({
  id: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().nullable().optional(),
});

export interface DtoBase {
  id: string;
  createdAt?: string;
  updatedAt?: string | null;
}

export const namedDtoSchema = dtoBaseSchema.extend({
  name: z.string(),
  description: z.string().nullable().optional(),
});

export interface NamedFields {
  name: string;
  description?: string | null;
}

export interface NamedDto extends DtoBase, NamedFields {}

export interface IdNameDto {
  id: string;
  name: string;
}
export type IdName = IdNameDto;

/**
 * Standard API error structure
 */
export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.string().optional(),
  path: z.string().optional(),
});

export type ApiErrorDto = z.infer<typeof apiErrorSchema>;
export type ApiError = ApiErrorDto;

/**
 * Standard Application Error Codes
 */

export const AppErrorCodes = {
  // Client errors (4xx)
  validation: 'VALIDATION_ERROR',
  unauthorized: 'UNAUTHORIZED',
  forbidden: 'FORBIDDEN',
  notFound: 'NOT_FOUND',
  conflict: 'CONFLICT',
  badRequest: 'BAD_REQUEST',
  rateLimited: 'RATE_LIMITED',
  payloadTooLarge: 'PAYLOAD_TOO_LARGE',
  unsupportedMediaType: 'UNSUPPORTED_MEDIA_TYPE',
  unprocessableEntity: 'UNPROCESSABLE_ENTITY',

  // Server errors (5xx)
  internal: 'INTERNAL_ERROR',
  externalService: 'EXTERNAL_SERVICE_ERROR',
  serviceUnavailable: 'SERVICE_UNAVAILABLE',
  timeout: 'TIMEOUT_ERROR',
  databaseError: 'DATABASE_ERROR',
  configurationError: 'CONFIGURATION_ERROR',

  // Domain-specific errors
  skuExists: 'SKU_EXISTS',
  duplicateEntry: 'DUPLICATE_ENTRY',
  invalidState: 'INVALID_STATE',
  operationFailed: 'OPERATION_FAILED',
  resourceLocked: 'RESOURCE_LOCKED',
  quotaExceeded: 'QUOTA_EXCEEDED',

  // Integration errors
  integrationError: 'INTEGRATION_ERROR',
  apiKeyInvalid: 'API_KEY_INVALID',
  webhookFailed: 'WEBHOOK_FAILED',
} as const;

export const appErrorCodeSchema = z.string();
export type AppErrorCodeDto = string;
export type AppErrorCode = AppErrorCodeDto;

export type AppErrorOptions = {
  code: AppErrorCode;
  httpStatus: number;
  cause?: unknown;
  meta?: Record<string, unknown> | undefined;
  expected?: boolean;
  /** Whether this error should trigger alerts/notifications */
  critical?: boolean;
  /** Retry hint for clients */
  retryable?: boolean;
  /** Suggested retry delay in milliseconds */
  retryAfterMs?: number;
};

export type ResolvedError = {
  message: string;
  code: string;
  status: number;
  details?: unknown;
};

export type MapStatusOptions = {
  defaultStatus?: number;
  fallbackCode?: string;
};

export interface AppErrorContext {
  userId?: string;
  requestId?: string;
  path?: string;
  method?: string;
  timestamp: string;
}

export type ClientErrorPayload = {
  message: string;
  stack?: string;
  url?: string;
  componentStack?: string;
  context?: Record<string, unknown>;
};

/**
 * Standard API response wrapper
 */
export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: apiErrorSchema.optional(),
  message: z.string().optional(),
});

export type ApiResponseDto<T = unknown> = {
  success: boolean;
  data?: T;
  error?: ApiErrorDto;
  message?: string;
};
export type ApiResponse<T> = ApiResponseDto<T>;

/**
 * Standard paginated list response
 */
export const listResponseSchema = z.object({
  items: z.array(z.unknown()),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number().optional(),
  hasMore: z.boolean().optional(),
});

export type ListResponseDto<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages?: number;
  hasMore?: boolean;
};
export type ListResponse<T> = ListResponseDto<T>;

/**
 * Utility type for creating a new entity (omits base fields)
 */
export type CreateDto<T extends DtoBase> = Omit<T, keyof DtoBase>;

/**
 * Utility type for updating an existing entity
 */
export type UpdateDto<T extends DtoBase> = Partial<CreateDto<T>>;

/**
 * Payload for save operations (create or update)
 */
export interface SavePayloadDto<T extends DtoBase> {
  id?: string;
  data: Partial<CreateDto<T>>;
}
export type SavePayload<T extends DtoBase> = SavePayloadDto<T>;

/**
 * Payload for create operations
 */
export type CreatePayloadDto<T extends DtoBase> = CreateDto<T>;
export type CreatePayload<T extends DtoBase> = CreatePayloadDto<T>;

/**
 * Payload for update operations
 */
export interface UpdatePayloadDto<T extends DtoBase> {
  id: string;
  data: Partial<CreateDto<T>>;
}
export type UpdatePayload<T extends DtoBase> = UpdatePayloadDto<T>;

/**
 * Base interface for all entities in the system.
 */
export interface BaseEntity {
  id: string;
  createdAt: string | Date;
  updatedAt: string | Date | null;
}

/**
 * Base interface for named entities.
 */
export interface NamedEntity extends BaseEntity, NamedFields {}

/**
 * MongoDB and Core Data Access Types
 */
export type MongoSettingRecord = { _id: string; key: string; value: string };
export type MongoDocument<T> = T & { _id: string };
export type ApiParams = { id: string };
