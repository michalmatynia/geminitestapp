export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { GET_handler, POST_handler, querySchema } from './handler';

export const GET = apiHandlerWithParams<{ collectionId: string }>(GET_handler, {
  source: 'agentcreator.teaching.collections.[collectionId].documents.GET',
  querySchema,
  requireAuth: true,
});

export const POST = apiHandlerWithParams<{ collectionId: string }>(POST_handler, {
  source: 'agentcreator.teaching.collections.[collectionId].documents.POST',
  requireAuth: true,
});
