import { AgentLeaseMutationRequestSchema } from '@/shared/contracts/agent-leases';
import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_handler, POST_handler, querySchema } from './handler';

export const GET = apiHandler(GET_handler, {
  source: 'agent.leases.GET',
  querySchema,
  requireAuth: true,
});

export const POST = apiHandler(POST_handler, {
  source: 'agent.leases.POST',
  parseJsonBody: true,
  bodySchema: AgentLeaseMutationRequestSchema,
  requireAuth: true,
});
