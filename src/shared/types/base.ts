// Base types for common patterns across the application
import type {
  LegacyPaginatedResponseDto,
} from '@/shared/contracts/http';

import type { BaseRecord } from './common';
import type { DtoBase, NamedDto, ApiResponse } from './dto-base';

/**
 * Base interface for all entities in the system
 */
export interface BaseEntity extends BaseRecord {
  id: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

/**
 * Base interface for named entities
 */
export interface NamedEntity extends BaseEntity {
  name: string;
  description?: string | null;
}

export type { DtoBase, NamedDto, ApiResponse };
export type PaginatedResponse<T> = LegacyPaginatedResponseDto<T>;

export * from './dto-utils';
