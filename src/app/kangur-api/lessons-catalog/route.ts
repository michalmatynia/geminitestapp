import { apiHandler } from '@/shared/lib/api/api-handler';
import {
  getKangurLessonsCatalogHandler,
  querySchema,
} from '@/app/api/kangur/lessons-catalog/handler';

export const GET = apiHandler(getKangurLessonsCatalogHandler, {
  successLogging: 'off',
  requireCsrf: false,
  resolveSessionUser: false,
  rateLimitKey: false,
  service: 'kangur.api',
  source: 'kangur-api.lessons-catalog.GET',
  querySchema,
});
