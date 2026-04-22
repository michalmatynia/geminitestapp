export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { postHandler } from './handler';

export const POST = apiHandlerWithParams<{ id: string }>(postHandler, {
  source: 'v2.integrations.products.[id].base.sku-check.POST',
  requireAuth: true,
  requireCsrf: false,
});
