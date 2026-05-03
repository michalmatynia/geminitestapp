export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler, postHandler } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'image-studio.projects.GET',
  requireAuth: true,
});

export const POST = apiHandler(postHandler, {
  source: 'image-studio.projects.POST',
  requireAuth: true,
});
