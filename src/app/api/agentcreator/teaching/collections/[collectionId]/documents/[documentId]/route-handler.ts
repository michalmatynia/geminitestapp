export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { deleteHandler } from './handler';

export const DELETE = apiHandlerWithParams<{ collectionId: string; documentId: string }>(deleteHandler, {
    source: 'agentcreator.teaching.collections.[collectionId].documents.[documentId].DELETE',
    requireAuth: true,
  }
);
