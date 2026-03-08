export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { GET_handler, POST_handler, querySchema } from './handler';

export const GET = apiHandlerWithParams<{ collectionId: string }>(
  async (request, ctx, params) => GET_handler(request, { ...ctx, params }),
  {
    source: 'agentcreator.teaching.collections.[collectionId].documents.GET',
    querySchema,
  }
);

export const POST = apiHandlerWithParams<{ collectionId: string }>(
  async (request, ctx, params) => POST_handler(request, { ...ctx, params }),
  {
    source: 'agentcreator.teaching.collections.[collectionId].documents.POST',
  }
);
