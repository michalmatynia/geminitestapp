export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { POST_handler } from './handler';

export const POST = apiHandlerWithParams<{ runId: string }>(POST_handler, {
  source: 'ai-paths.runs.[runId].cancel.POST',
});
