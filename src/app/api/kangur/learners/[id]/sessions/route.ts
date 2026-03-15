export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { getKangurLearnerSessionsHandler } from './handler';

export const GET = apiHandlerWithParams<{ id: string }>(getKangurLearnerSessionsHandler, {
  source: 'kangur.learners.[id].sessions.GET',
  service: 'kangur.api',
  successLogging: 'all',
  parseJsonBody: false,
});
