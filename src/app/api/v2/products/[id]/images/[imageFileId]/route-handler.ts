export const runtime = 'nodejs';

import { deleteHandler } from '@/app/api/v2/products/[id]/images/[imageFileId]/handler';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';


export const DELETE = apiHandlerWithParams<{ id: string; imageFileId: string }>(deleteHandler, {
  source: 'v2.products.[id].images.[imageFileId].DELETE',
  requireAuth: true,
});
