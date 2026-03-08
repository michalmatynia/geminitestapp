export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { disableSettingsRateLimit, GET_handler, POST_handler, querySchema } from './handler';

export const GET = apiHandler(GET_handler, {
  source: 'settings.GET',
  rateLimitKey: disableSettingsRateLimit ? false : 'api',
  querySchema,
});

export const POST = apiHandler(POST_handler, {
  source: 'settings.POST',
  rateLimitKey: disableSettingsRateLimit ? false : 'write',
});
