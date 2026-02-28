export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { GET_handler } from './handler';

export const GET = apiHandlerWithParams<{ runId: string }>(GET_handler, {
  source: 'image-studio.sequences.[runId].GET',
});
