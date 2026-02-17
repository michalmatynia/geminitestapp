export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { DELETE_handler, GET_handler } from './handler';

export const GET = apiHandlerWithParams<{ runId: string }>(GET_handler, {
  source: 'ai-paths.runs.detail',
});
export const DELETE = apiHandlerWithParams<{ runId: string }>(DELETE_handler, {
  source: 'ai-paths.runs.delete',
});
