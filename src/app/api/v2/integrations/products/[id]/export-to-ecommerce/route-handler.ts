export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { postExportToEcommerceHandler } from './handler';

export const POST = apiHandlerWithParams<{ id: string }>(postExportToEcommerceHandler, {
  source: 'v2.integrations.products.[id].export-to-ecommerce.POST',
  requireAuth: true,
  requireCsrf: false,
});
