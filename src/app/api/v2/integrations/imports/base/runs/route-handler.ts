export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler, postHandler, listRunsQuerySchema, startRunSchema } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'v2.integrations.imports.base.runs.GET',
  querySchema: listRunsQuerySchema,
  requireAuth: true,
});

export const POST = apiHandler(postHandler, {
  source: 'v2.integrations.imports.base.runs.POST',
  requireAuth: true,
  requireCsrf: false,
  parseJsonBody: true,
  bodySchema: startRunSchema,
});
