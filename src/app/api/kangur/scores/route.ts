export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { getKangurScoresHandler, postKangurScoresHandler } from './handler';

export const GET = apiHandler(getKangurScoresHandler, {
  source: 'kangur.scores.GET',
  service: 'kangur.api',
  successLogging: 'all',
});

export const POST = apiHandler(postKangurScoresHandler, {
  source: 'kangur.scores.POST',
  service: 'kangur.api',
  successLogging: 'all',
});
