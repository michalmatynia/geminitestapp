export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { getProductsMetadataHandler, postProductsMetadataHandler } from '../metadata/handler';

export const GET = apiHandler(
  (req, ctx) => getProductsMetadataHandler(req, ctx, { type: 'simple-parameters' }),
  { source: 'v2.products.simple-parameters.GET', requireAuth: true }
);

export const POST = apiHandler(
  (req, ctx) => postProductsMetadataHandler(req, ctx, { type: 'simple-parameters' }),
  { source: 'v2.products.simple-parameters.POST', requireAuth: true }
);
