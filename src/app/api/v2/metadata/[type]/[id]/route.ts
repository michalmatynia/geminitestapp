
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import {
  getMetadataIdHandler,
  putMetadataIdHandler,
  deleteMetadataIdHandler,
} from './handler';

export const GET = apiHandlerWithParams<{ type: string; id: string }>(getMetadataIdHandler, {
  source: 'v2.metadata.[type].[id].GET',
  requireAuth: true,
});

export const PUT = apiHandlerWithParams<{ type: string; id: string }>(putMetadataIdHandler, {
  source: 'v2.metadata.[type].[id].PUT',
  requireAuth: true,
});

export const DELETE = apiHandlerWithParams<{ type: string; id: string }>(deleteMetadataIdHandler, {
  source: 'v2.metadata.[type].[id].DELETE',
  requireAuth: true,
});
