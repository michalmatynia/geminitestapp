export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { patchKangurLearnerHandler } from './handler';

export const PATCH = apiHandlerWithParams<{ id: string }>(patchKangurLearnerHandler, {
  source: 'kangur.learners.PATCH',
  service: 'kangur.api',
  successLogging: 'all',
});
