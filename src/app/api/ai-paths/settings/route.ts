export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { DELETE_handler, GET_handler, POST_handler } from './handler';

export const GET = apiHandler(GET_handler, {
  source: 'ai-paths.settings.GET',
  requireAuth: true,
});

export const POST = apiHandler(POST_handler, {
  source: 'ai-paths.settings.POST',
  requireAuth: true,
});

export const DELETE = apiHandler(DELETE_handler, {
  source: 'ai-paths.settings.DELETE',
  requireAuth: true,
});
