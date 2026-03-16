export const runtime = 'nodejs';

import { z } from 'zod';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import {
  GET_products_metadata_handler,
  POST_products_metadata_handler,
  priceGroupCreatePayloadSchema,
  querySchema,
} from '../handler';

const typeParamSchema = z.object({
  type: z.string().trim().min(1, 'type is required'),
});

export const GET = apiHandlerWithParams<{ type: string }>(GET_products_metadata_handler, {
  source: 'v2.products.metadata.[type].GET',
  paramsSchema: typeParamSchema,
  querySchema,
  requireAuth: true,
});

export const POST = apiHandlerWithParams<{ type: string }>(POST_products_metadata_handler, {
  source: 'v2.products.metadata.[type].POST',
  paramsSchema: typeParamSchema,
  parseJsonBody: true,
  bodySchema: priceGroupCreatePayloadSchema,
  requireAuth: true,
});
