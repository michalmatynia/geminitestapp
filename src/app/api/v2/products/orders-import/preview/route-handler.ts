export const runtime = 'nodejs';

import {
  postHandler,
  previewOrdersImportSchema,
} from '@/app/api/v2/products/orders-import/preview/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';

export const POST = apiHandler(postHandler, {
  source: 'v2.products.orders-import.preview.POST',
  parseJsonBody: true,
  bodySchema: previewOrdersImportSchema,
  requireAuth: true,
});
