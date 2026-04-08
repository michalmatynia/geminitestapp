
import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_handler, POST_handler } from './handler';

export const GET = apiHandler(GET_handler, {
  source: 'system.diagnostics.mongo-indexes.GET',
  logSuccess: false,
  requireAuth: true,
});

export const POST = apiHandler(POST_handler, {
  source: 'system.diagnostics.mongo-indexes.POST',
  logSuccess: true,
  requireAuth: true,
});
