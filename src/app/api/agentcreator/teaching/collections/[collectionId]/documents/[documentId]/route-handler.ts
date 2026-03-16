export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { DELETE_handler } from './handler';

export const DELETE = apiHandlerWithParams<{ collectionId: string; documentId: string }>(
  async (request, ctx, params) => DELETE_handler(request, { ...ctx, params }),
  {
    source: 'agentcreator.teaching.collections.[collectionId].documents.[documentId].DELETE',
    requireAuth: true,
  }
);
