export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { postHandler } from './handler';

export const POST = apiHandlerWithParams<{ projectId: string }>(postHandler, {
  source: 'image-studio.projects.[projectId].assets.delete.POST',
  requireAuth: true,
});
