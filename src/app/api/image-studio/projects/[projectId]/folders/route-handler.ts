export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { deleteHandler, postHandler, deleteQuerySchema } from './handler';

export const POST = apiHandlerWithParams<{ projectId: string }>(postHandler, {
  source: 'image-studio.projects.[projectId].folders.POST',
  requireAuth: true,
});

export const DELETE = apiHandlerWithParams<{ projectId: string }>(deleteHandler, {
  source: 'image-studio.projects.[projectId].folders.DELETE',
  querySchema: deleteQuerySchema,
  requireAuth: true,
});
