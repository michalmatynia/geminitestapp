export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { POST_handler } from './handler';

export const POST = apiHandlerWithParams<{ collectionId: string }>(
  async (request, ctx, params) => POST_handler(request, { ...ctx, params }),
  {
    source: 'agentcreator.teaching.collections.[collectionId].search.POST',
    requireAuth: true,
  }
);
