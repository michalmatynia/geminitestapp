export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { DELETE_handler, GET_handler, deleteQuerySchema, listQuerySchema } from './handler';

export const GET = apiHandler(GET_handler, {
  source: 'ai-paths.runs.list',
  querySchema: listQuerySchema,
});

export const DELETE = apiHandler(DELETE_handler, {
  source: 'ai-paths.runs.clear',
  querySchema: deleteQuerySchema,
});
