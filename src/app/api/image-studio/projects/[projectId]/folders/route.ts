export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { DELETE_handler, POST_handler } from './handler';

export const POST = apiHandlerWithParams<{ projectId: string }>(POST_handler, {
  source: 'image-studio.projects.[projectId].folders.POST',
});

export const DELETE = apiHandlerWithParams<{ projectId: string }>(DELETE_handler, {
  source: 'image-studio.projects.[projectId].folders.DELETE',
});
