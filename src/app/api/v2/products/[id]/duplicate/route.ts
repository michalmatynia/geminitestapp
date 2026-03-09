export const runtime = 'nodejs';

import { POST_handler } from '@/app/api/v2/products/[id]/duplicate/handler';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';


export const POST = apiHandlerWithParams<{ id: string }>(POST_handler, {
  source: 'v2.products.[id].duplicate.POST',
});
