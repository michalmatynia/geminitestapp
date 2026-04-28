import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { listMongoFilemakerOrganizations } from '@/features/filemaker/server/filemaker-organizations-repository';
import { organisationSearchResponseSchema } from '@/shared/contracts/job-board';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export const querySchema = z.object({
  q: z.string().trim().min(1).max(200),
  limit: z
    .preprocess((v) => {
      if (typeof v === 'number') return v;
      if (typeof v !== 'string') return undefined;
      const parsed = Number.parseInt(v.trim(), 10);
      return Number.isFinite(parsed) ? parsed : undefined;
    }, z.number().int().positive().max(50).optional()),
});

export async function getHandler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const query = querySchema.parse({
    ...Object.fromEntries(new URL(req.url).searchParams.entries()),
    ...((ctx.query ?? {}) as Record<string, unknown>),
  });

  const limit = query.limit ?? 20;
  const result = await listMongoFilemakerOrganizations({
    query: query.q,
    pageSize: String(limit),
  });

  return NextResponse.json(
    organisationSearchResponseSchema.parse({
      hits: result.organizations.slice(0, limit).map((org) => ({
        id: org.id,
        name: org.name,
        taxId: org.taxId ?? null,
        krs: org.krs ?? null,
        city: org.city || null,
        tradingName: org.tradingName ?? null,
        cooperationStatus: org.cooperationStatus ?? null,
      })),
    })
  );
}
