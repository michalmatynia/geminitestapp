export const runtime = 'nodejs';

import { z } from 'zod';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import {
  getProductsMetadataIdHandler,
  putProductsMetadataIdHandler,
  deleteProductsMetadataIdHandler,
} from './handler';

const metadataIdParamSchema = z.object({
  type: z.string().trim().min(1, 'type is required'),
  id: z.string().trim().min(1, 'id is required'),
});

export const GET = apiHandlerWithParams<{ type: string; id: string }>(getProductsMetadataIdHandler, {
  source: 'v2.products.metadata.[type].[id].GET',
  paramsSchema: metadataIdParamSchema,
  requireAuth: true,
});

export const PUT = apiHandlerWithParams<{ type: string; id: string }>(putProductsMetadataIdHandler, {
  source: 'v2.products.metadata.[type].[id].PUT',
  paramsSchema: metadataIdParamSchema,
  requireAuth: true,
});

export const DELETE = apiHandlerWithParams<{ type: string; id: string }>(deleteProductsMetadataIdHandler, {
  source: 'v2.products.metadata.[type].[id].DELETE',
  paramsSchema: metadataIdParamSchema,
  requireAuth: true,
});
