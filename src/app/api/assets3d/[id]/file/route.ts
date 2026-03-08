export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { GET_handler } from './handler';

export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, {
  source: 'assets3d.[id].file.GET',
});
