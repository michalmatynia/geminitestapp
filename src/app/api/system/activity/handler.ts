import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import type { ActivityFilters } from '@/shared/contracts/system';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { assertSettingsManageAccess } from '@/features/auth/server';
import { getActivityRepository } from '@/shared/lib/observability/activity-repository';
import { commonListQuerySchema } from '@/shared/validations/api-schemas';

export const activityQuerySchema = commonListQuerySchema.extend({
  type: z.string().trim().optional(),
});

type ActivityListQuery = z.infer<typeof activityQuerySchema>;

/**
 * GET /api/system/activity
 * Fetches system-wide activity logs.
 */
export async function GET_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  await assertSettingsManageAccess();
  const query = ctx.query as ActivityListQuery;
  const repository = await getActivityRepository();

  const filters: ActivityFilters = {
    limit: query.pageSize,
    offset: (query.page - 1) * query.pageSize,
  };
  if (query.search !== undefined && query.search !== null) {
    filters.search = query.search;
  }
  if (query.type !== undefined && query.type !== null) {
    filters.type = query.type;
  }

  const [logs, total] = await Promise.all([
    repository.listActivity(filters),
    repository.countActivity(filters),
  ]);

  return NextResponse.json(
    {
      data: logs,
      total,
      page: query.page,
      pageSize: query.pageSize,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
