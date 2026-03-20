export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_handler, querySchema } from './handler';

export const GET = apiHandler(GET_handler, {
  source: 'ai-paths.runs.queue-status',
  querySchema,
});
