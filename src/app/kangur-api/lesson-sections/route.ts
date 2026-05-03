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
