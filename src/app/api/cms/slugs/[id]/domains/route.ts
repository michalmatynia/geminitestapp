
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { getHandler, putHandler } from './handler';

export const GET = apiHandlerWithParams<{ id: string }>(getHandler, {
  source: 'cms.slugs.[id].domains.GET',
  requireAuth: true,
});

export const PUT = apiHandlerWithParams<{ id: string }>(putHandler, {
  source: 'cms.slugs.[id].domains.PUT',
  requireAuth: true,
});
