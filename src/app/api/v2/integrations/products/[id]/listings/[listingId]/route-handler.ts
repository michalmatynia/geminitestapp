export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { deleteHandler, patchHandler } from './handler';

export const DELETE = apiHandlerWithParams<{ id: string; listingId: string }>(deleteHandler, {
  source: 'v2.integrations.products.[id].listings.[listingId].DELETE',
  requireAuth: true,
  requireCsrf: false,
});

export const PATCH = apiHandlerWithParams<{ id: string; listingId: string }>(patchHandler, {
  source: 'v2.integrations.products.[id].listings.[listingId].PATCH',
  requireAuth: true,
  requireCsrf: false,
});
