export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_handler, POST_handler, querySchema } from './handler';

export const GET = apiHandler(GET_handler, {
  source: 'ai-paths.trigger-buttons.GET',
  querySchema,
});

export const POST = apiHandler(POST_handler, {
  source: 'ai-paths.trigger-buttons.POST',
});
