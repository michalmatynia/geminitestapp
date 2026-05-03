
import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler, postHandler } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'analytics.insights.GET',
  requireAuth: true,
});
export const POST = apiHandler(postHandler, {
  source: 'analytics.insights.POST',
  requireAuth: true,
});
