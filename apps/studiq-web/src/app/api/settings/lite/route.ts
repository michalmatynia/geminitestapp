import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_handler, querySchema } from '@/app/api/settings/lite/handler';

const disableSettingsRateLimit = process.env['NODE_ENV'] !== 'production';

export const GET = apiHandler(GET_handler, {
  source: 'settings.lite.GET',
  rateLimitKey: disableSettingsRateLimit ? false : 'api',
  querySchema,
  requireAuth: false,
  resolveSessionUser: false,
});
