export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { DELETE_handler, POST_handler, deleteQuerySchema } from './handler';

export const POST = apiHandlerWithParams<{ projectId: string }>(POST_handler, {
  source: 'image-studio.projects.[projectId].folders.POST',
  requireAuth: true,
});

export const DELETE = apiHandlerWithParams<{ projectId: string }>(DELETE_handler, {
  source: 'image-studio.projects.[projectId].folders.DELETE',
  querySchema: deleteQuerySchema,
  requireAuth: true,
});
