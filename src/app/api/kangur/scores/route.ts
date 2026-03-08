export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler, apiOptionsHandler } from '@/shared/lib/api/api-handler';

import { getKangurScoresHandler, postKangurScoresHandler, querySchema } from './handler';

export const GET = apiHandler(getKangurScoresHandler, {
  source: 'kangur.scores.GET',
  service: 'kangur.api',
  successLogging: 'all',
  querySchema,
});

export const POST = apiHandler(postKangurScoresHandler, {
  source: 'kangur.scores.POST',
  service: 'kangur.api',
  successLogging: 'all',
  corsOrigins: [...KANGUR_MOBILE_WEB_CORS_ORIGINS],
});

export const OPTIONS = apiOptionsHandler({
  source: 'kangur.scores.OPTIONS',
  service: 'kangur.api',
  requireCsrf: false,
  corsOrigins: [...KANGUR_MOBILE_WEB_CORS_ORIGINS],
});
