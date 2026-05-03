export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { postHandler } from './handler';

export const POST = apiHandlerWithParams<{ collectionId: string }>(postHandler, {
    source: 'agentcreator.teaching.collections.[collectionId].search.POST',
    requireAuth: true,
  }
);
