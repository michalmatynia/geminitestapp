import { z } from 'zod';

import { type ApiEnvelopeDto } from './api-envelope';

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
export type UnknownRecordDto = Record<string, unknown>;
export type UnknownRecord = UnknownRecordDto;
export type StringRecordDto = Record<string, string>;
export type StringRecord = StringRecordDto;

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

interface NamedFields {
  name: string;
  description?: string | null;
}

export interface NamedDto extends DtoBase, NamedFields {}

export interface IdNameDto {
  id: string;
  name: string;
}
export type IdName = IdNameDto;

export interface CodeNameDto {
  code: string;
  name: string;
}
export type CodeName = CodeNameDto;

/**
 * Generic lookup DTOs
 */
export type NameLookupDto = {
  name: string;
};

export type TitleDescriptionDto = {
  title: string;
  description: string;
};

export type CatalogNameLookupDto = NameLookupDto & {
  catalogId: string;
};

export type LabeledOptionDto<TValue = string> = {
  label: string;
  value: TValue;
};
export type LabeledOption<TValue = string> = LabeledOptionDto<TValue>;

export type IdLabelOptionDto<TId extends string | number = string> = {
  id: TId;
  label: string;
};
export type IdLabelOption<TId extends string | number = string> = IdLabelOptionDto<TId>;

export type LabelValueOptionDto = LabeledOptionDto<string>;
export type LabelValueOption = LabelValueOptionDto;

export type IdLabeledOptionDto<TId extends string | number = string, TValue = string> = {
  id: TId;
  label: string;
  value: TValue;
};
export type IdLabeledOption<TId extends string | number = string, TValue = string> = IdLabeledOptionDto<
  TId,
  TValue
>;

export type LabeledOptionWithDescriptionDto<TValue = string> = LabeledOptionDto<TValue> & {
  description?: string;
};
export type LabeledOptionWithDescription<TValue = string> =
  LabeledOptionWithDescriptionDto<TValue>;

export type LabeledOptionWithDisabledDto<TValue = string> = LabeledOptionDto<TValue> & {
  disabled?: boolean;
};
export type LabeledOptionWithDisabled<TValue = string> = LabeledOptionWithDisabledDto<TValue>;

export type IdDto = {
  id: string;
};
export type Id = IdDto;

type IdDataPayload<TData = unknown> = {
  data: TData;
};

export type IdDataDto<TData = unknown> = {
  id: string;
} & IdDataPayload<TData>;
export type IdData<TData = unknown> = IdDataDto<TData>;

export type IdInputDto<TInput = unknown> = {
  id: string;
  input: TInput;
};
export type IdInput<TInput = unknown> = IdInputDto<TInput>;

export type OptionalIdDataDto<TData = unknown> = {
  id?: string;
} & IdDataPayload<TData>;
export type OptionalIdData<TData = unknown> = OptionalIdDataDto<TData>;

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
  errorId: string;
  message: string;
  code: string;
  httpStatus: number;
  expected: boolean;
  critical: boolean;
  retryable: boolean;
  category: string;
  suggestedActions: unknown[];
  retryAfterMs?: number;
  meta?: Record<string, unknown>;
  cause?: unknown;
};

export type MapStatusOptions = {
  retryAfterMs?: number;
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

/**
 * Standard API response wrapper
 */
export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: apiErrorSchema.optional(),
  message: z.string().optional(),
});

export type ApiResponseDto<T = unknown> = ApiEnvelopeDto<T, ApiErrorDto>;
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
 * Standard query parameters for pagination.
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type PaginationQueryDto = z.infer<typeof paginationQuerySchema>;
export type PaginationQuery = PaginationQueryDto;

export type CodeMessageIssueDto<TCode extends string = string> = {
  code: TCode;
  message: string;
};
export type CodeMessageIssue<TCode extends string = string> = CodeMessageIssueDto<TCode>;

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
interface SavePayloadDto<T extends DtoBase> {
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
interface UpdatePayloadDto<T extends DtoBase> {
  id: string;
  data: Partial<CreateDto<T>>;
}
export type UpdatePayload<T extends DtoBase> = UpdatePayloadDto<T>;

/**
 * Base interface for all entities in the system.
 */
interface BaseEntity {
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
export type MongoSettingRecordDto<TId = string, TValue = string> = {
  _id: TId;
  key: string;
  value: TValue;
};
export type MongoSettingRecord = MongoSettingRecordDto;
export type MongoDocument<T> = T & { _id: string };

/**
 * Common progress tracking structure
 */
export type ProgressSnapshotDto = {
  current: number;
  total: number;
  errors: number;
  metadata?: Record<string, unknown>;
};
export type ProgressSnapshot = ProgressSnapshotDto;
