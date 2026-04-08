
import { apiHandler } from '@/shared/lib/api/api-handler';

import { DELETE_handler, GET_handler } from './handler';

export const GET = apiHandler(GET_handler, {
  source: 'ai-insights.notifications.GET',
  requireAuth: true,
});
export const DELETE = apiHandler(DELETE_handler, {
  source: 'ai-insights.notifications.DELETE',
  requireAuth: true,
});
