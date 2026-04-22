export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { postHandler } from './handler';

export const POST = apiHandlerWithParams<{ id: string; connectionId: string }>(postHandler, {
  source: 'v2.integrations.[id].connections.[connectionId].linkedin.disconnect.POST',
  requireAuth: true,
});
