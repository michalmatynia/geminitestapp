export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { deleteHandler, getHandler } from './handler';

export const GET = apiHandlerWithParams<{ runId: string }>(getHandler, {
  source: 'ai-paths.runs.[runId].GET',
});
export const DELETE = apiHandlerWithParams<{ runId: string }>(deleteHandler, {
  source: 'ai-paths.runs.[runId].DELETE',
});
