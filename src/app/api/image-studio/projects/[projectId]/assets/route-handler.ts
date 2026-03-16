export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { GET_handler, POST_handler } from './handler';

export const GET = apiHandlerWithParams<{ projectId: string }>(GET_handler, {
  source: 'image-studio.projects.[projectId].assets.GET',
  requireAuth: true,
});

export const POST = apiHandlerWithParams<{ projectId: string }>(POST_handler, {
  source: 'image-studio.projects.[projectId].assets.POST',
  requireAuth: true,
});
