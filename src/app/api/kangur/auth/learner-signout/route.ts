export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { postKangurLearnerSignOutHandler } from './handler';

export const POST = apiHandler(postKangurLearnerSignOutHandler, {
  source: 'kangur.auth.learnerSignOut.POST',
  service: 'kangur.api',
  successLogging: 'all',
});
