export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { deleteFromEcommerceHandler } from './handler';

export const DELETE = apiHandlerWithParams<{ id: string }>(deleteFromEcommerceHandler, {
  source: 'v2.integrations.products.[id].delete-from-ecommerce.DELETE',
  requireAuth: true,
  requireCsrf: false,
});
