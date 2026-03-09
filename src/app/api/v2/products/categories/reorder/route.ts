export const runtime = 'nodejs';

import {
  POST_handler,
  reorderCategorySchema,
} from '@/app/api/v2/products/categories/reorder/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';


export const POST = apiHandler(POST_handler, {
  source: 'v2.products.categories.reorder.POST',
  parseJsonBody: true,
  bodySchema: reorderCategorySchema,
});
