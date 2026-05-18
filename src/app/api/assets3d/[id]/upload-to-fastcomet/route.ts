import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { postHandler } from './handler';

export const POST = apiHandlerWithParams<{ id: string }>(postHandler, {
  source: 'assets3d.[id].upload-to-fastcomet.POST',
  requireAuth: true,
});
