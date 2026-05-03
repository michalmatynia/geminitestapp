export const runtime = 'nodejs';

import {
  getProductsEntityHandler,
  putProductsEntityHandler,
  deleteProductsEntityHandler,
} from '@/app/api/v2/products/entities/handler';
import { updateCatalogSchema } from '@/shared/contracts/products/catalogs';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';


export const GET = apiHandlerWithParams<{ type: string; id: string }>(getProductsEntityHandler, {
  source: 'v2.products.entities.[type].[id].GET',
  requireAuth: true,
});

export const PUT = apiHandlerWithParams<{ type: string; id: string }>(putProductsEntityHandler, {
  source: 'v2.products.entities.[type].[id].PUT',
  parseJsonBody: true,
  bodySchema: updateCatalogSchema,
  requireAuth: true,
});

export const DELETE = apiHandlerWithParams<{ type: string; id: string }>(deleteProductsEntityHandler, {
  source: 'v2.products.entities.[type].[id].DELETE',
  requireAuth: true,
});
