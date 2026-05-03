
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { putTemplatesItemHandler, deleteTemplatesItemHandler } from '../../handler';

export const PUT = apiHandlerWithParams<{ type: string; id: string }>(putTemplatesItemHandler, {
  source: 'v2.templates.[type].[id].PUT',
  requireAuth: true,
});

export const DELETE = apiHandlerWithParams<{ type: string; id: string }>(deleteTemplatesItemHandler, {
  source: 'v2.templates.[type].[id].DELETE',
  requireAuth: true,
});
