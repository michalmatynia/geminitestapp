import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { listImageStudioSequenceRuns } from '@/features/ai/image-studio/server/sequence-run-repository';
import { type ImageStudioSequenceRunStatus } from '@/shared/contracts/image-studio';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import {
  normalizeOptionalQueryString,
  optionalIntegerQuerySchema,
  optionalTrimmedQueryString,
} from '@/shared/lib/api/query-schema';

const RUN_STATUSES = new Set<ImageStudioSequenceRunStatus>([
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled',
]);

const sequenceRunStatusSchema = z.preprocess((value) => {
  const normalized = normalizeOptionalQueryString(value)?.toLowerCase();
  return normalized && RUN_STATUSES.has(normalized as ImageStudioSequenceRunStatus)
    ? normalized
    : undefined;
}, z.enum(['queued', 'running', 'completed', 'failed', 'cancelled']).optional());

export const querySchema = z.object({
  projectId: optionalTrimmedQueryString(),
  sourceSlotId: optionalTrimmedQueryString(),
  status: sequenceRunStatusSchema,
  limit: optionalIntegerQuerySchema(z.number().int().min(0)).default(50),
  offset: optionalIntegerQuerySchema(z.number().int().min(0)).default(0),
});

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const query = (_ctx.query ?? {}) as z.infer<typeof querySchema>;

  const result = await listImageStudioSequenceRuns({
    ...(query.projectId ? { projectId: query.projectId } : {}),
    ...(query.sourceSlotId ? { sourceSlotId: query.sourceSlotId } : {}),
    ...(query.status ? { status: query.status } : {}),
    limit: query.limit,
    offset: query.offset,
  });

  return NextResponse.json(result);
}
