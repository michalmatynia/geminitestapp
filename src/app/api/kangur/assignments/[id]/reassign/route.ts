export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { postKangurAssignmentReassignHandler } from './handler';

export const POST = apiHandlerWithParams<{ id: string }>(postKangurAssignmentReassignHandler, {
  source: 'kangur.assignments.[id].reassign.POST',
  service: 'kangur.api',
  successLogging: 'all',
});
