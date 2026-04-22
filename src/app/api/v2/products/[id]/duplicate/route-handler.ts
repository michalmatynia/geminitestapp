export const runtime = 'nodejs';

import { postHandler } from '@/app/api/v2/products/[id]/duplicate/handler';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';


export const POST = apiHandlerWithParams<{ id: string }>(postHandler, {
  source: 'v2.products.[id].duplicate.POST',
  requireAuth: true,
});
