export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { getHandler, querySchema } from './handler';

export const GET = apiHandlerWithParams<{ personaId: string }>(getHandler, {
  source: 'agentcreator.personas.[personaId].memory.GET',
  querySchema,
  requireAuth: true,
});
