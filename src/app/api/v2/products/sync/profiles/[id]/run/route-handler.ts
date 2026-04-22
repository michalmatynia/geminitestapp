export const runtime = 'nodejs';

import { postHandler } from '@/app/api/v2/products/sync/profiles/[id]/run/handler';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';


export const POST = apiHandlerWithParams<{ id: string }>(postHandler, {
  source: 'v2.products.sync.profiles.[id].run.POST',
  requireAuth: true,
});
