/**
 * API Utilities Index
 * 
 * Central exports for API handling utilities and types.
 * Provides:
 * - API handler functions and context types
 * - Error response creation utilities
 * - JSON parsing and validation functions
 * - Query parameter normalization
 * - Type definitions for API routes
 */

export {
  apiHandler,
  apiHandlerWithParams,
  getQueryParams,
  type ApiHandlerContext,
  type ApiHandlerOptions,
  type ApiRouteHandler,
  type ApiRouteHandlerWithParams,
} from './api-handler';
export { createErrorResponse } from './handle-api-error';
export { parseJsonBody, parseObjectJsonBody } from './parse-json';
export {
  normalizeOptionalQueryString,
  optionalBooleanQuerySchema,
  optionalCsvQueryStringArray,
  optionalIntegerQuerySchema,
  optionalTrimmedQueryString,
  parseOptionalBooleanQueryValue,
  parseOptionalCsvQueryValue,
  parseOptionalIntegerQueryValue,
} from './query-schema';
export { buildRateLimitHeaders, enforceRateLimit, rateLimiters, type RateLimiterKey } from './rate-limit';
