export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { postAnalyzeSlotHandler } from './handler';

export const POST = apiHandlerWithParams<{ slotId: string }>(postAnalyzeSlotHandler, {
  source: 'image-studio.slots.[slotId].analysis.POST',
});
