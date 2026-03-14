export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { kangurLearnerUpdateInputSchema } from '@/shared/contracts/kangur';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { deleteKangurLearnerHandler, patchKangurLearnerHandler } from './handler';

export const PATCH = apiHandlerWithParams<{ id: string }>(patchKangurLearnerHandler, {
  source: 'kangur.learners.[id].PATCH',
  service: 'kangur.api',
  successLogging: 'all',
  parseJsonBody: true,
  bodySchema: kangurLearnerUpdateInputSchema,
});

export const DELETE = apiHandlerWithParams<{ id: string }>(deleteKangurLearnerHandler, {
  source: 'kangur.learners.[id].DELETE',
  service: 'kangur.api',
  successLogging: 'all',
  parseJsonBody: false,
});
