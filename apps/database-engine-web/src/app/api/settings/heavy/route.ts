import { apiHandler } from '@/shared/lib/api/api-handler';

import { disableSettingsRateLimit, getHeavyHandler } from '@/app/api/settings/heavy/handler';

export const GET = apiHandler(getHeavyHandler, {
  source: 'database-engine-web.settings.heavy.GET',
  rateLimitKey: disableSettingsRateLimit ? false : 'api',
  requireAuth: true,
  resolveSessionUser: false,
});
