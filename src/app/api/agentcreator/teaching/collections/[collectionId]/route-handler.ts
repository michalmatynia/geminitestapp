export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { deleteHandler, patchHandler } from './handler';

export const PATCH = apiHandlerWithParams<{ collectionId: string }>(patchHandler, {
  source: 'agentcreator.teaching.collections.[collectionId].PATCH',
  requireAuth: true,
});

export const DELETE = apiHandlerWithParams<{ collectionId: string }>(deleteHandler, {
  source: 'agentcreator.teaching.collections.[collectionId].DELETE',
  requireAuth: true,
});
