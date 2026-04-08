
import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_handler, POST_handler } from './handler';

export const GET = apiHandler(GET_handler, {
  source: 'drafts.GET',
  requireAuth: true,
});
export const POST = apiHandler(POST_handler, {
  source: 'drafts.POST',
  requireAuth: true,
});
