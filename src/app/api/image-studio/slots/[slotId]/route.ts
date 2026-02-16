export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { DELETE_handler, PATCH_handler } from './handler';

export const PATCH = apiHandlerWithParams<{ slotId: string }>(PATCH_handler, {
  source: 'image-studio.slots.[slotId].PATCH',
});

export const DELETE = apiHandlerWithParams<{ slotId: string }>(DELETE_handler, {
  source: 'image-studio.slots.[slotId].DELETE',
});
