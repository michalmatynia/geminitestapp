export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { postCropSlotHandler } from './handler';

export const POST = apiHandlerWithParams<{ slotId: string }>(postCropSlotHandler, {
  source: 'image-studio.slots.[slotId].crop.POST',
});
