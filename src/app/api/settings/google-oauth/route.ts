import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler, postHandler } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'settings.google-oauth.GET',
  requireAuth: true,
  cacheControl: 'no-store',
});

export const POST = apiHandler(postHandler, {
  source: 'settings.google-oauth.POST',
  requireAuth: true,
  cacheControl: 'no-store',
});
