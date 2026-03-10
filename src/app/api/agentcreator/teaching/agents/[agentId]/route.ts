export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { DELETE_handler, PATCH_handler } from './handler';

export const PATCH = apiHandlerWithParams<{ agentId: string }>(
  async (request, ctx, params) => PATCH_handler(request, { ...ctx, params }),
  {
    source: 'agentcreator.teaching.agents.[agentId].PATCH',
    requireAuth: true,
  }
);

export const DELETE = apiHandlerWithParams<{ agentId: string }>(
  async (request, ctx, params) => DELETE_handler(request, { ...ctx, params }),
  {
    source: 'agentcreator.teaching.agents.[agentId].DELETE',
    requireAuth: true,
  }
);
