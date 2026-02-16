export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_handler } from './handler';

const disableSettingsRateLimit = process.env['NODE_ENV'] !== 'production';

export const GET = apiHandler(GET_handler, {
  source: 'settings.GET.lite',
  rateLimitKey: disableSettingsRateLimit ? false : 'api',
});
