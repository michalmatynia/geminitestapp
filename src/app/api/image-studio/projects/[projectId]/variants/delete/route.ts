export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { POST_handler } from './handler';

export const POST = apiHandlerWithParams<{ projectId: string }>(POST_handler, {
  source: 'image-studio.projects.[projectId].variants.delete.POST',
});
