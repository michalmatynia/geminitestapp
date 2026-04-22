
import { apiHandler } from '@/shared/lib/api/api-handler';

import { disableSettingsRateLimit, getHandler, postHandler, querySchema } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'settings.GET',
  rateLimitKey: disableSettingsRateLimit ? false : 'api',
  querySchema,
  requireAuth: true,
  resolveSessionUser: false,
});

export const POST = apiHandler(postHandler, {
  source: 'settings.POST',
  rateLimitKey: disableSettingsRateLimit ? false : 'write',
  requireAuth: true,
  resolveSessionUser: false,
});
