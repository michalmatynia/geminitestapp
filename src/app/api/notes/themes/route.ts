
import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_handler, POST_handler, querySchema } from './handler';

export const GET = apiHandler(GET_handler, {
  source: 'notes.themes.GET',
  querySchema,
  requireAuth: true,
});
export const POST = apiHandler(POST_handler, {
  source: 'notes.themes.POST',
  requireAuth: true,
});
