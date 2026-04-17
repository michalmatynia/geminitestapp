import { apiHandler } from '@/shared/lib/api/api-handler';

import { getApprovalGatesHandler, querySchema } from './handler';

export const GET = apiHandler(getApprovalGatesHandler, {
  source: 'agent.approval-gates.GET',
  querySchema,
  requireAuth: true,
});
