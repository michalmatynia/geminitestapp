export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { DELETE_handler } from './handler';

export const DELETE = apiHandlerWithParams<{ id: string; listingId: string }>(DELETE_handler, {
  source: 'v2.integrations.products.[id].listings.[listingId].purge.DELETE',
  requireCsrf: false,
});
