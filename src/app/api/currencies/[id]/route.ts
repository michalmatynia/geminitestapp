export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import {
  GET_metadata_id_handler,
  PUT_metadata_id_handler,
  DELETE_metadata_id_handler,
} from '../../v2/metadata/[type]/[id]/handler';

export const GET = apiHandlerWithParams<{ id: string }>(
  (req, ctx, params) => GET_metadata_id_handler(req, ctx, { type: 'currencies', id: params.id }),
  { source: 'currencies.[id].GET' }
);

export const PUT = apiHandlerWithParams<{ id: string }>(
  (req, ctx, params) => PUT_metadata_id_handler(req, ctx, { type: 'currencies', id: params.id }),
  { source: 'currencies.[id].PUT' }
);

export const DELETE = apiHandlerWithParams<{ id: string }>(
  (req, ctx, params) => DELETE_metadata_id_handler(req, ctx, { type: 'currencies', id: params.id }),
  { source: 'currencies.[id].DELETE' }
);
