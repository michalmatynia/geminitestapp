import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { listCompanies } from '@/features/job-board/server/companies-repository';
import { companyListResponseSchema } from '@/shared/contracts/job-board';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export const querySchema = z.object({
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
  const companies = await listCompanies({ limit: query.limit ?? 100 });
  return NextResponse.json(companyListResponseSchema.parse({ companies }));
}
