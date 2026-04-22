export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { postHandler } from './handler';

export const POST = apiHandlerWithParams<{ slotId: string }>(postHandler, {
  source: 'image-studio.slots.[slotId].masks.POST',
  requireAuth: true,
});
