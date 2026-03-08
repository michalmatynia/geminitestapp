export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler, apiOptionsHandler } from '@/shared/lib/api/api-handler';

import { postKangurLearnerSignOutHandler } from './handler';
import { KANGUR_MOBILE_WEB_CORS_ORIGINS } from '../../shared/cors';

export const POST = apiHandler(postKangurLearnerSignOutHandler, {
  source: 'kangur.auth.learner-signout.POST',
  service: 'kangur.api',
  successLogging: 'all',
  corsOrigins: [...KANGUR_MOBILE_WEB_CORS_ORIGINS],
});

export const OPTIONS = apiOptionsHandler({
  source: 'kangur.auth.learnerSignOut.OPTIONS',
  service: 'kangur.api',
  requireCsrf: false,
  corsOrigins: [...KANGUR_MOBILE_WEB_CORS_ORIGINS],
});
