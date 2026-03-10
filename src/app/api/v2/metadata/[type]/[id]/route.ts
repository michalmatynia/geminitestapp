export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import {
  GET_metadata_id_handler,
  PUT_metadata_id_handler,
  DELETE_metadata_id_handler,
} from './handler';

export const GET = apiHandlerWithParams<{ type: string; id: string }>(GET_metadata_id_handler, {
  source: 'v2.metadata.[type].[id].GET',
  requireAuth: true,
});

export const PUT = apiHandlerWithParams<{ type: string; id: string }>(PUT_metadata_id_handler, {
  source: 'v2.metadata.[type].[id].PUT',
  requireAuth: true,
});

export const DELETE = apiHandlerWithParams<{ type: string; id: string }>(DELETE_metadata_id_handler, {
  source: 'v2.metadata.[type].[id].DELETE',
  requireAuth: true,
});
