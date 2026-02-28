export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { disableSettingsRateLimit, GET_heavy_handler } from './handler';

export const GET = apiHandler(GET_heavy_handler, {
  source: 'settings.GET.heavy',
  rateLimitKey: disableSettingsRateLimit ? false : 'api',
});
