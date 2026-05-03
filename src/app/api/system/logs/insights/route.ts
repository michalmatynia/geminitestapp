
import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler, postHandler } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'system.logs.insights.GET',
  requireAuth: true,
});
export const POST = apiHandler(postHandler, {
  source: 'system.logs.insights.POST',
  requireAuth: true,
});
