export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { deleteHandler, getHandler, postHandler } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'ai-paths.settings.GET',
  requireAuth: true,
});

export const POST = apiHandler(postHandler, {
  source: 'ai-paths.settings.POST',
  requireAuth: true,
});

export const DELETE = apiHandler(deleteHandler, {
  source: 'ai-paths.settings.DELETE',
  requireAuth: true,
});
