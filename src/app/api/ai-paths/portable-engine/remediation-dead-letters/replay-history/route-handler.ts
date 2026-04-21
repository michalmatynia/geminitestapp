export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { getReplayHistoryHandler, querySchema } from './handler';

export const GET = apiHandler(getReplayHistoryHandler, {
  source: 'ai-paths.portable-engine.remediation-dead-letters.replay-history.GET',
  querySchema,
});
