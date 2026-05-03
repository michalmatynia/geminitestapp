export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { deletePathRunsHandler, getPathRunsHandler } from './handler';
import { deleteQuerySchema, listQuerySchema } from './query-schemas';

export const GET = apiHandler(getPathRunsHandler, {
  source: 'ai-paths.runs.GET',
  querySchema: listQuerySchema,
});

export const DELETE = apiHandler(deletePathRunsHandler, {
  source: 'ai-paths.runs.DELETE',
  querySchema: deleteQuerySchema,
});
