export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { getPlaywrightRunHandler } from './handler';

export const GET = apiHandlerWithParams<{ runId: string }>(getPlaywrightRunHandler, {
  source: 'ai-paths.playwright.[runId].GET',
});
