export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { postImageStudioMasksHandler } from './handler';

export const POST = apiHandlerWithParams<{ slotId: string }>(
  postImageStudioMasksHandler,
  { source: 'image-studio.slots.[slotId].masks.POST' }
);
