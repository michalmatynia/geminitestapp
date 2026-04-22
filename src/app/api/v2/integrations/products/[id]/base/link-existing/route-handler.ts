export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { postHandler } from './handler';

export const POST = apiHandlerWithParams<{ id: string }>(postHandler, {
  source: 'v2.integrations.products.[id].base.link-existing.POST',
  requireAuth: true,
  requireCsrf: false,
});
