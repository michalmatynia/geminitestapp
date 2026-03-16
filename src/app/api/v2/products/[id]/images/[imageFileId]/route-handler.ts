export const runtime = 'nodejs';

import { DELETE_handler } from '@/app/api/v2/products/[id]/images/[imageFileId]/handler';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';


export const DELETE = apiHandlerWithParams<{ id: string; imageFileId: string }>(DELETE_handler, {
  source: 'v2.products.[id].images.[imageFileId].DELETE',
  requireAuth: true,
});
