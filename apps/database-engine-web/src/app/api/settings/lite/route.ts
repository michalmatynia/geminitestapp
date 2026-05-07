import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler, querySchema } from '@/app/api/settings/lite/handler';

const disableSettingsRateLimit = process.env['NODE_ENV'] !== 'production';

export const GET = apiHandler(getHandler, {
  source: 'database-engine-web.settings.lite.GET',
  rateLimitKey: disableSettingsRateLimit ? false : 'api',
  querySchema,
  requireAuth: false,
  resolveSessionUser: false,
});
