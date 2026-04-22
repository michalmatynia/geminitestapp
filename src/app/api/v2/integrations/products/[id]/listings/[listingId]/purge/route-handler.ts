export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { deleteHandler } from './handler';

export const DELETE = apiHandlerWithParams<{ id: string; listingId: string }>(deleteHandler, {
  source: 'v2.integrations.products.[id].listings.[listingId].purge.DELETE',
  requireCsrf: false,
  requireAuth: true,
});
