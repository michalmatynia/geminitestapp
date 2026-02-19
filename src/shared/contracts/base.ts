import { z } from 'zod';

/**
 * Foundation schemas used across all contracts
 */

export const statusSchema = z.enum(['pending', 'running', 'completed', 'failed', 'cancelled', 'canceled']);
export type StatusDto = z.infer<typeof statusSchema>;

export const localizedSchema = z.record(z.string(), z.string().nullable());
export type LocalizedDto = z.infer<typeof localizedSchema>;

export const dtoBaseSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
});
export type DtoBase = z.infer<typeof dtoBaseSchema>;

export const namedDtoSchema = dtoBaseSchema.extend({
  name: z.string(),
  description: z.string().nullable().optional(),
});
export type NamedDto = z.infer<typeof namedDtoSchema>;

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

/**
 * Payload for create operations
 */
export type CreatePayloadDto<T extends DtoBase> = CreateDto<T>;

/**
 * Payload for update operations
 */
export interface UpdatePayloadDto<T extends DtoBase> {
  id: string;
  data: Partial<CreateDto<T>>;
}
