export const runtime = 'nodejs';

import { z } from 'zod';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import {
  GET_products_metadata_id_handler,
  PUT_products_metadata_id_handler,
  DELETE_products_metadata_id_handler,
} from './handler';

const metadataIdParamSchema = z.object({
  type: z.string().trim().min(1, 'type is required'),
  id: z.string().trim().min(1, 'id is required'),
});

export const GET = apiHandlerWithParams<{ type: string; id: string }>(GET_products_metadata_id_handler, {
  source: 'v2.products.metadata.[type].[id].GET',
  paramsSchema: metadataIdParamSchema,
});

export const PUT = apiHandlerWithParams<{ type: string; id: string }>(PUT_products_metadata_id_handler, {
  source: 'v2.products.metadata.[type].[id].PUT',
  paramsSchema: metadataIdParamSchema,
});

export const DELETE = apiHandlerWithParams<{ type: string; id: string }>(DELETE_products_metadata_id_handler, {
  source: 'v2.products.metadata.[type].[id].DELETE',
  paramsSchema: metadataIdParamSchema,
});
