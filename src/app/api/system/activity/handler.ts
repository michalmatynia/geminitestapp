import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { observabilityApplicationIdSchema, type ActivityFilters } from '@/shared/contracts/system';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { assertSettingsManageAccess } from '@/features/auth/server';
import { getActivityRepository } from '@/shared/lib/observability/activity-repository';
import { commonListQuerySchema } from '@/shared/validations/api-schemas';

export const activityQuerySchema = commonListQuerySchema.extend({
  type: z.string().trim().optional(),
  applicationId: observabilityApplicationIdSchema.optional(),
});

type ActivityListQuery = z.infer<typeof activityQuerySchema>;

/**
 * GET /api/system/activity
 * Fetches system-wide activity logs.
 */
/**
 * Handles HTTP requests.
 *
 * - Validates request inputs
 * - Performs business logic
 * - Returns appropriate response
 *
 * @param req - NextRequest object
 * @param ctx - API handler context
 * @returns Response with operation result
 */
export async function getHandler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
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
  if (query.applicationId !== undefined && query.applicationId !== null) {
    filters.applicationId = query.applicationId;
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
