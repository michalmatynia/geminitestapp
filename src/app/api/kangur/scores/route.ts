export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { kangurScoreCreateInputSchema } from '@/shared/contracts/kangur';
import { apiHandler } from '@/shared/lib/api/api-handler';

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
  parseJsonBody: true,
  bodySchema: kangurScoreCreateInputSchema,
});
