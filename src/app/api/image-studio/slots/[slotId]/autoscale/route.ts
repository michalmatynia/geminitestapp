export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { postAutoScaleSlotHandler } from './handler';

export const POST = apiHandlerWithParams<{ slotId: string }>(
  postAutoScaleSlotHandler,
  { source: 'image-studio.slots.[slotId].autoscale.POST' }
);
