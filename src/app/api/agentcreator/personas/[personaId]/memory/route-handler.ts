export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { GET_handler, querySchema } from './handler';

export const GET = apiHandlerWithParams<{ personaId: string }>(GET_handler, {
  source: 'agentcreator.personas.[personaId].memory.GET',
  querySchema,
  requireAuth: true,
});
