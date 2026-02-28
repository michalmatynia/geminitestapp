export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { DELETE_handler } from './handler';

export const DELETE = apiHandlerWithParams<{ id: string; imageFileId: string }>(DELETE_handler, {
  source: 'products.[id].images.[imageFileId].DELETE',
});
