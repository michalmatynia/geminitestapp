// Base types for common patterns across the application
import type { BaseRecord } from './common';

export interface BaseEntity extends BaseRecord {
  id: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface NamedEntity extends BaseEntity {
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
