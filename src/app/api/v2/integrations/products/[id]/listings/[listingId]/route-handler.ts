export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { DELETE_handler, PATCH_handler } from './handler';

export const DELETE = apiHandlerWithParams<{ id: string; listingId: string }>(DELETE_handler, {
  source: 'v2.integrations.products.[id].listings.[listingId].DELETE',
  requireAuth: true,
  requireCsrf: false,
});

export const PATCH = apiHandlerWithParams<{ id: string; listingId: string }>(PATCH_handler, {
  source: 'v2.integrations.products.[id].listings.[listingId].PATCH',
  requireAuth: true,
  requireCsrf: false,
});
