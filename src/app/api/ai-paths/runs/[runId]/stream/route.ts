export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { getAiPathRunStreamHandler } from './handler';

export const GET = apiHandlerWithParams<{ runId: string }>(
  getAiPathRunStreamHandler,
  { source: 'ai-paths.runs.stream' }
);
