export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { postHandler } from './handler';

export const POST = apiHandlerWithParams<{ projectId: string }>(postHandler, {
  source: 'image-studio.projects.[projectId].slots.ensure-from-upload.POST',
  requireAuth: true,
});
