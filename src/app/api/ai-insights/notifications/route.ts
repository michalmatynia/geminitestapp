
import { apiHandler } from '@/shared/lib/api/api-handler';

import { deleteHandler, getHandler } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'ai-insights.notifications.GET',
  requireAuth: true,
});
export const DELETE = apiHandler(deleteHandler, {
  source: 'ai-insights.notifications.DELETE',
  requireAuth: true,
});
