export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { postUpscaleSlotHandler } from './handler';

export const POST = apiHandlerWithParams<{ slotId: string }>(
  postUpscaleSlotHandler,
  { source: 'image-studio.slots.[slotId].upscale.POST' }
);
