export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { postHandler } from './handler';

export const POST = apiHandlerWithParams<{ id: string; listingId: string }>(postHandler, {
  source: 'v2.integrations.products.[id].listings.[listingId].sync.POST',
  requireAuth: true,
  requireCsrf: false,
});
