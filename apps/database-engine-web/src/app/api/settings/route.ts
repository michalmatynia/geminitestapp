import { apiHandler } from '@/shared/lib/api/api-handler';

import {
  disableSettingsRateLimit,
  getHandler,
  postHandler,
  querySchema,
} from '@/app/api/settings/handler';

export const GET = apiHandler(getHandler, {
  source: 'database-engine-web.settings.GET',
  rateLimitKey: disableSettingsRateLimit ? false : 'api',
  querySchema,
  requireAuth: true,
  resolveSessionUser: false,
});

export const POST = apiHandler(postHandler, {
  source: 'database-engine-web.settings.POST',
  rateLimitKey: disableSettingsRateLimit ? false : 'write',
  requireAuth: true,
  resolveSessionUser: false,
});
