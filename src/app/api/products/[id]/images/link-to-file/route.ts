export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { POST_handler } from './handler';

export const POST = apiHandlerWithParams<{ id: string }>(POST_handler, {
  source: 'products.[id].images.link-to-file.POST',
});
