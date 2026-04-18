import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import {
  GET_handler,
  querySchema,
} from '@/app/api/agentcreator/personas/[personaId]/visuals/handler';

export const GET = apiHandlerWithParams<{ personaId: string }>(
  async (request, ctx, params) => GET_handler(request, { ...ctx, params }, params),
  {
    source: 'agentcreator.personas.[personaId].visuals.GET',
    querySchema,
    resolveSessionUser: false,
  }
);
