import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getActivityRepository } from '@/features/observability/server';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api';
import { commonListQuerySchema } from '@/shared/validations/api-schemas';

type ListQuery = z.infer<typeof commonListQuerySchema>;

/**
 * GET /api/system/activity
 * Fetches system-wide activity logs.
 */
async function GET_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const query = ctx.query as ListQuery;
  const repository = await getActivityRepository();
  
  const filters = {
    limit: query.pageSize,
    offset: (query.page - 1) * query.pageSize,
    search: query.search,
  };

  const [logs, total] = await Promise.all([
    repository.listActivity(filters),
    repository.countActivity(filters),
  ]);

  return NextResponse.json({
    data: logs,
    total,
    page: query.page,
    pageSize: query.pageSize,
  });
}

export const GET = apiHandler(GET_handler, {
  source: 'system.activity.GET',
  querySchema: commonListQuerySchema,
});
