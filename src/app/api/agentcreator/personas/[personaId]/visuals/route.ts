export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { GET_handler } from './handler';

export const GET = apiHandlerWithParams<{ personaId: string }>(GET_handler, {
  source: 'agentcreator.personas.[personaId].visuals.GET',
  requireAuth: true,
});
