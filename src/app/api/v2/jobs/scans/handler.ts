import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  createJobScan,
  listJobScansWithSync,
  synchronizeJobScan,
} from '@/features/job-board/server/job-scans-service';
import {
  jobScanCreateRequestSchema,
  jobScanCreateResponseSchema,
  jobScanListResponseSchema,
  type JobScanCreateRequest,
} from '@/shared/contracts/job-board';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export { jobScanCreateRequestSchema };

export const querySchema = z.object({
  limit: z
    .preprocess((v) => {
      if (typeof v === 'number') return v;
      if (typeof v !== 'string') return undefined;
      const parsed = Number.parseInt(v.trim(), 10);
      return Number.isFinite(parsed) ? parsed : undefined;
    }, z.number().int().positive().max(200).optional()),
});

export async function getHandler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const query = querySchema.parse({
    ...Object.fromEntries(new URL(req.url).searchParams.entries()),
    ...((ctx.query ?? {}) as Record<string, unknown>),
  });
  const scans = await listJobScansWithSync({ limit: query.limit ?? 50 });
  return NextResponse.json(jobScanListResponseSchema.parse({ scans }));
}

export async function postHandler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const body = ctx.body as JobScanCreateRequest;
  const created = await createJobScan({
    sourceUrl: body.sourceUrl,
    ...(body.provider ? { provider: body.provider } : {}),
    createdBy: ctx.userId ?? null,
  });
  const synchronized = await synchronizeJobScan(created);
  return NextResponse.json(jobScanCreateResponseSchema.parse({ scan: synchronized }), {
    status: 201,
  });
}
