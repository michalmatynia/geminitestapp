import { apiHandler } from '@/shared/lib/api/api-handler';

import {
  disableSettingsRateLimit,
  getHandler,
  postHandler,
  querySchema,
} from '../../../server/settings/handlers';

export const GET = apiHandler(getHandler, {
  source: 'database-engine-web.settings.GET',
  rateLimitKey: disableSettingsRateLimit ? false : 'api',
  querySchema,
  requireAuth: false,
  resolveSessionUser: false,
});

export const POST = apiHandler(postHandler, {
  source: 'database-engine-web.settings.POST',
  rateLimitKey: disableSettingsRateLimit ? false : 'write',
  requireAuth: false,
  resolveSessionUser: false,
});
