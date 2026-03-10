export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { GET_handler, PUT_handler } from './handler';

export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, {
  source: 'cms.slugs.[id].domains.GET',
  requireAuth: true,
});

export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, {
  source: 'cms.slugs.[id].domains.PUT',
  requireAuth: true,
});
