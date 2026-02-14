export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

import {
  listImageStudioRuns,
  type ImageStudioRunStatus,
} from '@/features/ai/image-studio/server/run-repository';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const RUN_STATUSES = new Set<ImageStudioRunStatus>(['queued', 'running', 'completed', 'failed']);

const parsePositiveInteger = (value: string | null, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, parsed);
};

async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const searchParams = req.nextUrl.searchParams;
  const projectId = searchParams.get('projectId')?.trim() || null;
  const sourceSlotId = searchParams.get('sourceSlotId')?.trim() || null;
  const statusParam = searchParams.get('status')?.trim().toLowerCase() || null;
  const status = statusParam && RUN_STATUSES.has(statusParam as ImageStudioRunStatus)
    ? (statusParam as ImageStudioRunStatus)
    : null;
  const limit = parsePositiveInteger(searchParams.get('limit'), 50);
  const offset = parsePositiveInteger(searchParams.get('offset'), 0);

  const result = await listImageStudioRuns({
    ...(projectId ? { projectId } : {}),
    ...(sourceSlotId ? { sourceSlotId } : {}),
    ...(status ? { status } : {}),
    limit,
    offset,
  });

  return NextResponse.json(result);
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  {
    source: 'image-studio.runs.GET',
  }
);
