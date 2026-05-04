/**
 * Kangur API Lessons Route
 * 
 * API route for Kangur lessons management.
 * Provides:
 * - GET endpoint for retrieving lessons
 * - POST endpoint for creating/updating lessons
 * - Body and query schema validation
 * - CSRF-exempt public API access
 * - Success logging configuration
 */

import { apiHandler } from '@/shared/lib/api/api-handler';
import {
  bodySchema,
  getKangurLessonsHandler,
  postKangurLessonsHandler,
  querySchema,
} from '@/app/api/kangur/lessons/handler';

const ROUTE_OPTIONS = {
  successLogging: 'off',
  requireCsrf: false,
  resolveSessionUser: false,
  rateLimitKey: false,
  service: 'kangur.api',
} as const;

export const GET = apiHandler(getKangurLessonsHandler, {
  ...ROUTE_OPTIONS,
  source: 'kangur-api.lessons.GET',
  querySchema,
});

export const POST = apiHandler(postKangurLessonsHandler, {
  ...ROUTE_OPTIONS,
  source: 'kangur-api.lessons.POST',
  parseJsonBody: true,
  bodySchema,
});
