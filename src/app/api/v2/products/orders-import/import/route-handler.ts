export const runtime = 'nodejs';

import {
  postHandler,
  importOrdersImportSchema,
} from '@/app/api/v2/products/orders-import/import/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';

export const POST = apiHandler(postHandler, {
  source: 'v2.products.orders-import.import.POST',
  parseJsonBody: true,
  bodySchema: importOrdersImportSchema,
  requireAuth: true,
});
