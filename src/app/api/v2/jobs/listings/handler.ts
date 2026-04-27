import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { listJobListings } from '@/features/job-board/server/job-listings-repository';
import { jobListingListResponseSchema } from '@/shared/contracts/job-board';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export const querySchema = z.object({
  companyId: z.string().trim().min(1).max(160).optional(),
  limit: z
    .preprocess((v) => {
      if (typeof v === 'number') return v;
      if (typeof v !== 'string') return undefined;
      const parsed = Number.parseInt(v.trim(), 10);
      return Number.isFinite(parsed) ? parsed : undefined;
    }, z.number().int().positive().max(500).optional()),
});

export async function getHandler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const query = querySchema.parse({
    ...Object.fromEntries(new URL(req.url).searchParams.entries()),
    ...((ctx.query ?? {}) as Record<string, unknown>),
  });
  const listings = await listJobListings({
    companyId: query.companyId ?? null,
    limit: query.limit ?? 100,
  });
  return NextResponse.json(jobListingListResponseSchema.parse({ listings }));
}
