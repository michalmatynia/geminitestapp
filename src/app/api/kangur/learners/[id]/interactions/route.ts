export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { getKangurLearnerInteractionsHandler } from './handler';

export const GET = apiHandlerWithParams<{ id: string }>(getKangurLearnerInteractionsHandler, {
  source: 'kangur.learners.[id].interactions.GET',
  service: 'kangur.api',
  successLogging: 'all',
});
