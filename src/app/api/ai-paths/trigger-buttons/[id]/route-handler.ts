export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { deleteHandler, patchHandler } from './handler';

export const PATCH = apiHandlerWithParams<{ id: string }>(patchHandler, {
  source: 'ai-paths.trigger-buttons.[id].PATCH',
});

export const DELETE = apiHandlerWithParams<{ id: string }>(deleteHandler, {
  source: 'ai-paths.trigger-buttons.[id].DELETE',
});
