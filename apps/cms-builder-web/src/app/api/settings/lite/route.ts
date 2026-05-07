import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler, querySchema } from '@/shared/server/api/settings/lite/handler';

const disableSettingsRateLimit = process.env['NODE_ENV'] !== 'production';

export const GET = apiHandler(getHandler, {
  source: 'cms-builder-web.settings.lite.GET',
  rateLimitKey: disableSettingsRateLimit ? false : 'api',
  querySchema,
  requireAuth: false,
  resolveSessionUser: false,
});
