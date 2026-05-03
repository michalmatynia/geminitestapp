export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler, postHandler } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'v2.integrations.GET',
  requireAuth: true,
  cacheControl: 'private, max-age=300, stale-while-revalidate=600',
});

export const POST = apiHandler(postHandler, {
  source: 'v2.integrations.POST',
  requireCsrf: false,
  requireAuth: true,
});
