export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler, postHandler, querySchema } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'ai-paths.trigger-buttons.GET',
  querySchema,
});

export const POST = apiHandler(postHandler, {
  source: 'ai-paths.trigger-buttons.POST',
});
