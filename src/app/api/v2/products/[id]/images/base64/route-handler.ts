export const runtime = 'nodejs';
export const revalidate = 60;

import { postHandler } from '@/app/api/v2/products/[id]/images/base64/handler';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';


export const POST = apiHandlerWithParams<{ id: string }>(postHandler, {
  source: 'v2.products.[id].images.base64.POST',
  requireAuth: true,
});
