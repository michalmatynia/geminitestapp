export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { getHandler, postHandler } from './handler';

export const GET = apiHandlerWithParams<{ projectId: string }>(getHandler, {
  source: 'image-studio.projects.[projectId].assets.GET',
  requireAuth: true,
});

export const POST = apiHandlerWithParams<{ projectId: string }>(postHandler, {
  source: 'image-studio.projects.[projectId].assets.POST',
  requireAuth: true,
});
