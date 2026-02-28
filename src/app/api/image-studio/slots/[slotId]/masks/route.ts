export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { POST_handler } from './handler';

export const POST = apiHandlerWithParams<{ slotId: string }>(POST_handler, {
  source: 'image-studio.slots.[slotId].masks.POST',
});
