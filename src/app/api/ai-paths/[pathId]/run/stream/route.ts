export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { GET_handler } from './handler';

export const GET = apiHandlerWithParams<{ pathId: string }>(GET_handler, {
  source: 'ai-paths.legacy-run-stream',
});
