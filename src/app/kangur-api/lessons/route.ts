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
