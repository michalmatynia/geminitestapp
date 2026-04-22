import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import { deleteHandler } from './handler';

export const DELETE = apiHandlerWithParams<{ scanId: string }>(deleteHandler, {
  source: 'v2.products.scans.[scanId].DELETE',
  requireAuth: true,
});
