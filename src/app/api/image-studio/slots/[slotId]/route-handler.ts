export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { deleteHandler, patchHandler, deleteQuerySchema } from './handler';

export const PATCH = apiHandlerWithParams<{ slotId: string }>(patchHandler, {
  source: 'image-studio.slots.[slotId].PATCH',
  requireAuth: true,
});

export const DELETE = apiHandlerWithParams<{ slotId: string }>(deleteHandler, {
  source: 'image-studio.slots.[slotId].DELETE',
  querySchema: deleteQuerySchema,
  requireAuth: true,
});
