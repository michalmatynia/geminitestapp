export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { postCenterSlotHandler } from './handler';

export const POST = apiHandlerWithParams<{ slotId: string }>(
  postCenterSlotHandler,
  { source: 'image-studio.slots.[slotId].center.POST' }
);
