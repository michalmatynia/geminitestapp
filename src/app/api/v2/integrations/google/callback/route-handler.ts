export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'v2.integrations.google.callback.GET',
  requireAuth: true,
  cacheControl: 'no-store',
});
