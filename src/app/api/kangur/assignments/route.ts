export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { kangurAssignmentCreateInputSchema } from '@/shared/contracts/kangur';
import { apiHandler } from '@/shared/lib/api/api-handler';

import { getKangurAssignmentsHandler, postKangurAssignmentsHandler, querySchema } from './handler';

export const GET = apiHandler(getKangurAssignmentsHandler, {
  source: 'kangur.assignments.GET',
  service: 'kangur.api',
  successLogging: 'all',
  querySchema,
});

export const POST = apiHandler(postKangurAssignmentsHandler, {
  source: 'kangur.assignments.POST',
  service: 'kangur.api',
  successLogging: 'all',
  parseJsonBody: true,
  bodySchema: kangurAssignmentCreateInputSchema,
});
