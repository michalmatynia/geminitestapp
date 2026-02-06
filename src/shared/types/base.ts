// Base types for common patterns across the application
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

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
