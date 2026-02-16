export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { DELETE_handler, GET_handler } from './handler';

export const GET = apiHandler(GET_handler, {
  source: 'ai-paths.runs.list',
});

export const DELETE = apiHandler(DELETE_handler, {
  source: 'ai-paths.runs.clear',
});
