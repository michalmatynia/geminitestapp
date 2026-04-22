export const runtime = 'nodejs';

import { z } from 'zod';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import {
  getProductsMetadataHandler,
  postProductsMetadataHandler,
  priceGroupCreatePayloadSchema,
  querySchema,
} from '../handler';

const typeParamSchema = z.object({
  type: z.string().trim().min(1, 'type is required'),
});

export const GET = apiHandlerWithParams<{ type: string }>(getProductsMetadataHandler, {
  source: 'v2.products.metadata.[type].GET',
  paramsSchema: typeParamSchema,
  querySchema,
  requireAuth: true,
  cacheControl: 'private, max-age=300, stale-while-revalidate=600',
});

export const POST = apiHandlerWithParams<{ type: string }>(postProductsMetadataHandler, {
  source: 'v2.products.metadata.[type].POST',
  paramsSchema: typeParamSchema,
  parseJsonBody: true,
  bodySchema: priceGroupCreatePayloadSchema,
  requireAuth: true,
});
