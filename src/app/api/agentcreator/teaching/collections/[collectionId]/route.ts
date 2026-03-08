export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { DELETE_handler, PATCH_handler } from './handler';

export const PATCH = apiHandlerWithParams<{ collectionId: string }>(
  async (request, ctx, params) => PATCH_handler(request, { ...ctx, params }),
  {
    source: 'agentcreator.teaching.collections.[collectionId].PATCH',
  }
);

export const DELETE = apiHandlerWithParams<{ collectionId: string }>(
  async (request, ctx, params) => DELETE_handler(request, { ...ctx, params }),
  {
    source: 'agentcreator.teaching.collections.[collectionId].DELETE',
  }
);
