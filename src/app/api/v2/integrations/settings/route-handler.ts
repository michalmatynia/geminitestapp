export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler, postHandler, querySchema } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'v2.integrations.settings.GET',
  querySchema,
  requireAuth: true,
});

export const POST = apiHandler(postHandler, {
  source: 'v2.integrations.settings.POST',
  requireCsrf: false,
  requireAuth: true,
});
