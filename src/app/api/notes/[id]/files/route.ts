
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { GET_handler, POST_handler } from './handler';

export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, {
  source: 'notes.[id].files.GET',
  requireAuth: true,
});

export const POST = apiHandlerWithParams<{ id: string }>(POST_handler, {
  source: 'notes.[id].files.POST',
  requireAuth: true,
});
