export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { patchKangurAssignmentHandler } from './handler';

export const PATCH = apiHandlerWithParams<{ id: string }>(patchKangurAssignmentHandler, {
  source: 'kangur.assignments.[id].PATCH',
  service: 'kangur.api',
  successLogging: 'all',
});
