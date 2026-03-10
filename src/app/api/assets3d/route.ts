export const runtime = 'nodejs';
export const revalidate = 60;

import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_handler, POST_handler, querySchema } from './handler';

export const GET = apiHandler(GET_handler, {
  source: 'assets3d.GET',
  querySchema,
  requireAuth: true,
});

export const POST = apiHandler(POST_handler, {
  source: 'assets3d.POST',
  requireAuth: true,
});
