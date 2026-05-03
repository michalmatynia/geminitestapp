
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { getHandler, postHandler } from './handler';

export const GET = apiHandlerWithParams<{ id: string }>(getHandler, {
  source: 'notes.[id].files.GET',
  requireAuth: true,
});

export const POST = apiHandlerWithParams<{ id: string }>(postHandler, {
  source: 'notes.[id].files.POST',
  requireAuth: true,
});
