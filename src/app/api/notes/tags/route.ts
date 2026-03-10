export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_handler, POST_handler, querySchema } from './handler';

export const GET = apiHandler(GET_handler, {
  source: 'notes.tags.GET',
  querySchema,
  requireAuth: true,
});
export const POST = apiHandler(POST_handler, {
  source: 'notes.tags.POST',
  requireAuth: true,
});
