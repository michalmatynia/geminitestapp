export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { getHandler, postHandler, querySchema } from './handler';

export const GET = apiHandlerWithParams<{ collectionId: string }>(getHandler, {
  source: 'agentcreator.teaching.collections.[collectionId].documents.GET',
  querySchema,
  requireAuth: true,
});

export const POST = apiHandlerWithParams<{ collectionId: string }>(postHandler, {
  source: 'agentcreator.teaching.collections.[collectionId].documents.POST',
  requireAuth: true,
});
