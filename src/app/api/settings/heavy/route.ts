
import { apiHandler } from '@/shared/lib/api/api-handler';

import {
  disableSettingsRateLimit,
  getHeavyHandler,
} from '@/shared/server/api/settings/heavy/handler';

export const GET = apiHandler(getHeavyHandler, {
  source: 'settings.heavy.GET',
  rateLimitKey: disableSettingsRateLimit ? false : 'api',
  requireAuth: true,
  resolveSessionUser: false,
});
