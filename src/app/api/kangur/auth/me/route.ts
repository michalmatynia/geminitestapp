export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { getKangurAuthMeHandler } from './handler';

export const GET = apiHandler(getKangurAuthMeHandler, {
  source: 'kangur.auth.me.GET',
  service: 'kangur.api',
  successLogging: 'all',
});
