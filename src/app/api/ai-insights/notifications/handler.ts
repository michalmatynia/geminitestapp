import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  clearAiInsightNotifications,
  listAiInsightNotifications,
} from '@/features/ai/insights/server';
import { startAiInsightsQueue } from '@/features/jobs/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';

const listSchema = z.object({
  limit: z.coerce.number().int().positive().max(50).optional(),
});

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  startAiInsightsQueue();
  const url = new URL(req.url);
  const parsed = listSchema.parse(Object.fromEntries(url.searchParams.entries()));
  const notifications = await listAiInsightNotifications(parsed.limit ?? 20);
  return NextResponse.json({ notifications });
}

export async function DELETE_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  startAiInsightsQueue();
  await clearAiInsightNotifications();
  return NextResponse.json({ ok: true });
}
