
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { getHandler } from './handler';

export const GET = apiHandlerWithParams<{ id: string }>(getHandler, {
  source: 'assets3d.[id].file.GET',
  requireAuth: true,
});

export const HEAD = apiHandlerWithParams<{ id: string }>(getHandler, {
  source: 'assets3d.[id].file.HEAD',
  requireAuth: true,
});
