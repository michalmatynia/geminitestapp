import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { listImageStudioRuns } from '@/features/ai/server';
import type { ImageStudioRunStatus, ImageStudioRunsResponse } from '@/shared/contracts/image-studio';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import {
  normalizeOptionalQueryString,
  optionalIntegerQuerySchema,
  optionalTrimmedQueryString,
} from '@/shared/lib/api/query-schema';

const RUN_STATUSES = new Set<ImageStudioRunStatus>(['queued', 'running', 'completed', 'failed']);

const imageStudioRunStatusSchema = z.preprocess((value) => {
  const normalized = normalizeOptionalQueryString(value)?.toLowerCase();
  return normalized && RUN_STATUSES.has(normalized as ImageStudioRunStatus) ? normalized : undefined;
}, z.enum(['queued', 'running', 'completed', 'failed']).optional());

export const querySchema = z.object({
  projectId: optionalTrimmedQueryString(),
  sourceSlotId: optionalTrimmedQueryString(),
  status: imageStudioRunStatusSchema,
  limit: optionalIntegerQuerySchema(z.number().int().min(0)).default(50),
  offset: optionalIntegerQuerySchema(z.number().int().min(0)).default(0),
});

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const query = (_ctx.query ?? {}) as z.infer<typeof querySchema>;

  const result: ImageStudioRunsResponse = await listImageStudioRuns({
    ...(query.projectId ? { projectId: query.projectId } : {}),
    ...(query.sourceSlotId ? { sourceSlotId: query.sourceSlotId } : {}),
    ...(query.status ? { status: query.status } : {}),
    limit: query.limit,
    offset: query.offset,
  });

  return NextResponse.json(result);
}
