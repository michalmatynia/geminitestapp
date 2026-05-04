/**
 * Kangur API Lesson Sections Route
 * 
 * API route for Kangur lesson sections management.
 * Provides:
 * - GET endpoint for retrieving lesson sections
 * - POST endpoint for creating/updating sections
 * - Query schema validation
 * - CSRF-exempt public API access
 * - Success logging configuration
 */

import { apiHandler } from '@/shared/lib/api/api-handler';
import {
  getKangurLessonSectionsHandler,
  postKangurLessonSectionsHandler,
  querySchema,
} from '@/app/api/kangur/lesson-sections/handler';

const ROUTE_OPTIONS = {
  successLogging: 'off',
  requireCsrf: false,
  resolveSessionUser: false,
  rateLimitKey: false,
  service: 'kangur.api',
} as const;

export const GET = apiHandler(getKangurLessonSectionsHandler, {
  ...ROUTE_OPTIONS,
  source: 'kangur-api.lesson-sections.GET',
  querySchema,
});

export const POST = apiHandler(postKangurLessonSectionsHandler, {
  ...ROUTE_OPTIONS,
  source: 'kangur-api.lesson-sections.POST',
  parseJsonBody: true,
});
