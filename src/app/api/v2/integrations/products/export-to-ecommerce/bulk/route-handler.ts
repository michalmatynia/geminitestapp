export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { bulkSchema, postBulkExportToEcommerceHandler } from './handler';

export const POST = apiHandler(postBulkExportToEcommerceHandler, {
  source: 'v2.integrations.products.export-to-ecommerce.bulk.POST',
  parseJsonBody: true,
  bodySchema: bulkSchema,
  requireAuth: true,
  requireCsrf: false,
});
