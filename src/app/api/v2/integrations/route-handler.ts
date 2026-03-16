export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_handler, POST_handler } from './handler';

export const GET = apiHandler(GET_handler, {
  source: 'v2.integrations.GET',
  requireAuth: true,
});

export const POST = apiHandler(POST_handler, {
  source: 'v2.integrations.POST',
  requireCsrf: false,
  requireAuth: true,
});
