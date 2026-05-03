
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { deleteHandler } from './handler';

export const DELETE = apiHandlerWithParams<{ id: string; slotIndex: string }>(deleteHandler, {
  source: 'notes.[id].files.[slotIndex].DELETE',
  requireAuth: true,
});
