// Base types for common patterns across the application
import type {
  ApiEnvelopeDto,
  LegacyPaginatedResponseDto,
} from '@/shared/dtos/http';

import type { BaseRecord } from './common';

/**
 * Base interface for all entities in the system
 */
export interface BaseEntity extends BaseRecord {
  id: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

/**
 * Base interface for all DTOs (Data Transfer Objects)
 */
export interface DtoBase {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Base interface for named entities
 */
export interface NamedEntity extends BaseEntity {
  name: string;
  description?: string | null;
}

/**
 * Base interface for named DTOs
 */
export interface NamedDto extends DtoBase {
  name: string;
  description?: string | null;
}

export type PaginatedResponse<T> = LegacyPaginatedResponseDto<T>;
export type ApiResponse<T = unknown> = ApiEnvelopeDto<T>;

export * from './dto-utils';
