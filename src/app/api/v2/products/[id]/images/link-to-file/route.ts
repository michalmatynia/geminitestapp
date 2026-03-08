export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { POST_handler } from '@/app/api/v2/products/[id]/images/link-to-file/handler';

export const POST = apiHandlerWithParams<{ id: string }>(POST_handler, {
  source: 'v2.products.[id].images.link-to-file.POST',
});
