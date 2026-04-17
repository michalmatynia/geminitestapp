import { AgentLeaseMutationRequestSchema } from '@/shared/contracts/agent-leases';
import { apiHandler } from '@/shared/lib/api/api-handler';

import { getLeasesHandler, postLeasesHandler, querySchema } from './handler';

export const GET = apiHandler(getLeasesHandler, {
  source: 'agent.leases.GET',
  querySchema,
  requireAuth: true,
});

export const POST = apiHandler(postLeasesHandler, {
  source: 'agent.leases.POST',
  parseJsonBody: true,
  bodySchema: AgentLeaseMutationRequestSchema,
  requireAuth: true,
});
