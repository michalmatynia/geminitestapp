export const runtime = 'nodejs';
export const revalidate = 60;

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { POST_handler } from '@/app/api/products/[id]/images/base64/handler';

export const POST = apiHandlerWithParams<{ id: string }>(POST_handler, {
  source: 'products.[id].images.base64.POST',
});
