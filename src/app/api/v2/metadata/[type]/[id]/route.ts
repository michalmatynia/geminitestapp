export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import {
  GET_metadata_id_handler,
  PUT_metadata_id_handler,
  DELETE_metadata_id_handler,
} from './handler';

export const GET = apiHandlerWithParams(GET_metadata_id_handler, {
  source: 'metadata-id.GET',
});

export const PUT = apiHandlerWithParams(PUT_metadata_id_handler, {
  source: 'metadata-id.PUT',
});

export const DELETE = apiHandlerWithParams(DELETE_metadata_id_handler, {
  source: 'metadata-id.DELETE',
});
