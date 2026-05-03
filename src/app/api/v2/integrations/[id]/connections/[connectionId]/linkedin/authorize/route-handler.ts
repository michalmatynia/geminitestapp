export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { getHandler } from './handler';

export const GET = apiHandlerWithParams<{ id: string; connectionId: string }>(getHandler, {
  source: 'v2.integrations.[id].connections.[connectionId].linkedin.authorize.GET',
  requireAuth: true,
});
