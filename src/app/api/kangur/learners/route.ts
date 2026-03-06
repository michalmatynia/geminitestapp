export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { getKangurLearnersHandler, postKangurLearnersHandler } from './handler';

export const GET = apiHandler(getKangurLearnersHandler, {
  source: 'kangur.learners.GET',
  service: 'kangur.api',
  successLogging: 'all',
});

export const POST = apiHandler(postKangurLearnersHandler, {
  source: 'kangur.learners.POST',
  service: 'kangur.api',
  successLogging: 'all',
});
