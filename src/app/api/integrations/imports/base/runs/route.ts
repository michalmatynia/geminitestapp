export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import {
  GET_handler,
  POST_handler,
  listRunsQuerySchema,
  startRunSchema,
} from './handler';

export const GET = apiHandler(GET_handler, {
  source: 'integrations.imports.base.runs.GET',
  requireCsrf: false,
  querySchema: listRunsQuerySchema,
});

export const POST = apiHandler(POST_handler, {
  source: 'integrations.imports.base.runs.POST',
  requireCsrf: false,
  parseJsonBody: true,
  bodySchema: startRunSchema,
});
