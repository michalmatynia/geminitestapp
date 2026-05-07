import { apiHandler } from '@/shared/lib/api/api-handler';

import { getLiteHandler, liteQuerySchema } from '../../../../server/settings/handlers';

const disableSettingsRateLimit = process.env['NODE_ENV'] !== 'production';

export const GET = apiHandler(getLiteHandler, {
  source: 'database-engine-web.settings.lite.GET',
  rateLimitKey: disableSettingsRateLimit ? false : 'api',
  querySchema: liteQuerySchema,
  requireAuth: false,
  resolveSessionUser: false,
});
