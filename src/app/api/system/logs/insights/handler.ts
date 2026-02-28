import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { generateLogsInsight } from '@/features/ai/insights/generator';
import { listAiInsights } from '@/features/ai/insights/repository';
import { startAiInsightsQueue } from '@/features/jobs/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const listSchema = z.object({
  limit: z.coerce.number().int().positive().max(50).optional(),
});

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  startAiInsightsQueue();
  const url = new URL(req.url);
  const parsed = listSchema.parse(Object.fromEntries(url.searchParams.entries()));
  const insights = await listAiInsights('logs', parsed.limit ?? 10);
  return NextResponse.json({ insights });
}

export async function POST_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  startAiInsightsQueue();
  const insight = await generateLogsInsight({ source: 'manual' });
  return NextResponse.json({ insight });
}
