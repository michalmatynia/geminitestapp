export const runtime = 'nodejs';

import {
  POST_handler,
  previewOrdersImportSchema,
} from '@/app/api/v2/products/orders-import/preview/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';

export const POST = apiHandler(POST_handler, {
  source: 'v2.products.orders-import.preview.POST',
  parseJsonBody: true,
  bodySchema: previewOrdersImportSchema,
  requireAuth: true,
});
