import { apiHandler } from '@/shared/lib/api/api-handler';

import {
  disableSettingsRateLimit,
  getHandler,
  postHandler,
  querySchema,
} from '@/shared/server/api/settings/handler';

export const GET = apiHandler(getHandler, {
  source: 'cms-builder-web.settings.GET',
  rateLimitKey: disableSettingsRateLimit ? false : 'api',
  querySchema,
  requireAuth: true,
  resolveSessionUser: false,
});

export const POST = apiHandler(postHandler, {
  source: 'cms-builder-web.settings.POST',
  rateLimitKey: disableSettingsRateLimit ? false : 'write',
  requireAuth: true,
  resolveSessionUser: false,
});
