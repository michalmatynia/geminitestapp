export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { postKangurLogoutHandler } from './handler';

export const POST = apiHandler(postKangurLogoutHandler, {
  source: 'kangur.auth.logout.POST',
  service: 'kangur.api',
  successLogging: 'all',
});
