import { apiHandler } from '@/shared/lib/api/api-handler';

import { disableSettingsRateLimit, getHeavyHandler } from '../../../../server/settings/handlers';

export const GET = apiHandler(getHeavyHandler, {
  source: 'database-engine-web.settings.heavy.GET',
  rateLimitKey: disableSettingsRateLimit ? false : 'api',
  requireAuth: false,
  resolveSessionUser: false,
});
