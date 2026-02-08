import { z } from 'zod';

/**
 * Common schema for a single ID parameter.
 */
export const idParamSchema = z.object({
  id: z.string().trim().min(1, 'ID is required'),
});

/**
 * Common schema for pagination query parameters.
 */
export const paginationQuerySchema = z.object({
  page: z.preprocess(
    (v) => (v ? parseInt(v as string, 10) : 1),
    z.number().int().min(1).default(1)
  ),
  pageSize: z.preprocess(
    (v) => (v ? parseInt(v as string, 10) : 20),
    z.number().int().min(1).max(100).default(20)
  ),
});

/**
 * Common schema for search query parameters.
 */
export const searchQuerySchema = z.object({
  search: z.string().trim().optional(),
});

/**
 * Common schema for date range query parameters.
 */
export const dateRangeQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * Combined common list query parameters.
 */
export const commonListQuerySchema = paginationQuerySchema
  .merge(searchQuerySchema)
  .merge(dateRangeQuerySchema);
