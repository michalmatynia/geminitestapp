export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { postHandler } from './handler';

export const POST = apiHandlerWithParams<{ runId: string }>(postHandler, {
  source: 'image-studio.sequences.[runId].cancel.POST',
  requireAuth: true,
});
