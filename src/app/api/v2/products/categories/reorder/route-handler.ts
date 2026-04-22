export const runtime = 'nodejs';

import {
  postHandler,
  reorderCategorySchema,
} from '@/app/api/v2/products/categories/reorder/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';


export const POST = apiHandler(postHandler, {
  source: 'v2.products.categories.reorder.POST',
  parseJsonBody: true,
  bodySchema: reorderCategorySchema,
  requireAuth: true,
});
