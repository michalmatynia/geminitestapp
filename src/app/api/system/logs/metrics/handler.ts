import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getSystemLogMetrics } from '@/features/observability/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const levelSchema = z.enum(['info', 'warn', 'error']);

const metricsSchema = z.object({
  level: levelSchema.optional(),
  source: z.string().trim().optional(),
  method: z.string().trim().optional(),
  statusCode: z.coerce.number().int().optional(),
  requestId: z.string().trim().optional(),
  userId: z.string().trim().optional(),
  fingerprint: z.string().trim().optional(),
  category: z.string().trim().optional(),
  query: z.string().trim().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const url = new URL(req.url);
  const parsed = metricsSchema.parse(Object.fromEntries(url.searchParams.entries()));
  const metrics = await getSystemLogMetrics({
    level: parsed.level ?? undefined,
    source: parsed.source ?? undefined,
    method: parsed.method ?? undefined,
    statusCode: parsed.statusCode ?? undefined,
    requestId: parsed.requestId ?? undefined,
    userId: parsed.userId ?? undefined,
    fingerprint: parsed.fingerprint ?? undefined,
    category: parsed.category ?? undefined,
    query: parsed.query ?? undefined,
    from: parsed.from ? new Date(parsed.from) : null,
    to: parsed.to ? new Date(parsed.to) : null,
  });
  return NextResponse.json(
    { metrics },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
