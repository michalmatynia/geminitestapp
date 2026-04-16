
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { DELETE_handler } from './handler';

export const DELETE = apiHandlerWithParams<{ id: string; slotIndex: string }>(DELETE_handler, {
  source: 'notes.[id].files.[slotIndex].DELETE',
  requireAuth: true,
});
