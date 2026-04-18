export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { getHandler } from './handler';

export const GET = apiHandlerWithParams<{ personaId: string }>(getHandler, {
  source: 'agentcreator.personas.[personaId].visuals.GET',
  requireAuth: false,
});
