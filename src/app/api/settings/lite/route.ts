
import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler, querySchema } from './handler';

const disableSettingsRateLimit = process.env['NODE_ENV'] !== 'production';

export const GET = apiHandler(getHandler, {
  source: 'settings.lite.GET',
  rateLimitKey: disableSettingsRateLimit ? false : 'api',
  querySchema,
  requireAuth: false,
  resolveSessionUser: false,
});
