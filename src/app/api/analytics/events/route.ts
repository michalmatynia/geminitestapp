export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_handler, POST_handler, querySchema } from './handler';

export const POST = apiHandler(POST_handler, {
  source: 'analytics.events.POST',
  requireCsrf: false,
  rateLimitKey: 'write',
});

export const GET = apiHandler(GET_handler, {
  source: 'analytics.events.GET',
  querySchema,
});
