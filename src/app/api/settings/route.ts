
import { apiHandler } from '@/shared/lib/api/api-handler';

import { disableSettingsRateLimit, GET_handler, POST_handler, querySchema } from './handler';

export const GET = apiHandler(GET_handler, {
  source: 'settings.GET',
  rateLimitKey: disableSettingsRateLimit ? false : 'api',
  querySchema,
  requireAuth: true,
});

export const POST = apiHandler(POST_handler, {
  source: 'settings.POST',
  rateLimitKey: disableSettingsRateLimit ? false : 'write',
  requireAuth: true,
});
