import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import { DELETE_handler } from './handler';

export const DELETE = apiHandlerWithParams<{ scanId: string }>(DELETE_handler, {
  source: 'v2.products.scans.[scanId].DELETE',
  requireAuth: true,
});
