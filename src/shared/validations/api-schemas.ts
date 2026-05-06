/**
 * API Validation Schemas
 * 
 * Re-exports common API validation schemas from base contracts.
 * Provides:
 * - ID parameter validation for route parameters
 * - Pagination query schemas for list endpoints
 * - Search query validation with filtering
 * - Date range query schemas for time-based filtering
 * - Common list query patterns used across API endpoints
 * 
 * These schemas ensure consistent validation patterns
 * across all API routes and maintain type safety.
 */

export {
  idParamSchema,
  paginationQuerySchema,
  searchQuerySchema,
  dateRangeQuerySchema,
  commonListQuerySchema,
} from '@/shared/contracts/base';
