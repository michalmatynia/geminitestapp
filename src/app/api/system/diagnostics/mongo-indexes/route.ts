
import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler, postHandler } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'system.diagnostics.mongo-indexes.GET',
  logSuccess: false,
  requireAuth: true,
});

export const POST = apiHandler(postHandler, {
  source: 'system.diagnostics.mongo-indexes.POST',
  logSuccess: true,
  requireAuth: true,
});
