export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { getHandler } from './handler';

export const GET = apiHandlerWithParams<{ runId: string }>(getHandler, {
  source: 'image-studio.sequences.[runId].GET',
  requireAuth: true,
});
