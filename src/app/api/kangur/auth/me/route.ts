
import { apiHandler } from '@/shared/lib/api/api-handler';
import { apiOptionsHandler } from '@/shared/lib/api/api-handler';

import { getKangurAuthMeHandler } from './handler';
import { KANGUR_TRUSTED_WEB_ORIGINS } from '../../shared/cors';

export const GET = apiHandler(getKangurAuthMeHandler, {
  source: 'kangur.auth.me.GET',
  service: 'kangur.api',
  successLogging: 'all',
  corsOrigins: [...KANGUR_TRUSTED_WEB_ORIGINS],
});

export const OPTIONS = apiOptionsHandler({
  source: 'kangur.auth.me.OPTIONS',
  service: 'kangur.api',
  requireCsrf: false,
  corsOrigins: [...KANGUR_TRUSTED_WEB_ORIGINS],
});
