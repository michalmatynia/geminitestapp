import { NextRequest, NextResponse } from 'next/server';

import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { internalError } from '@/shared/errors/app-error';
import { apiHandlerWithParams, type ApiHandlerContext as _ApiHandlerContext } from '@/shared/lib/api/api-handler';
import prisma from '@/shared/lib/db/prisma';

const DEBUG_CHATBOT = process.env['DEBUG_CHATBOT'] === 'true';

async function GET_handler(req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
): Promise<Response> {
  const requestStart = Date.now();
  if (!('agentBrowserSnapshot' in prisma)) {
    throw internalError(
      'Agent snapshots not initialized. Run prisma generate/db push.'
    );
  }
  const { runId } = await params;
  const url = new URL(req.url);
  const stepId = url.searchParams.get('stepId');
  const limit = Number(url.searchParams.get('limit') ?? '12');
  const take = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 50) : 12;
  const snapshots = await prisma.agentBrowserSnapshot.findMany({
    where: { runId, ...(stepId ? { stepId } : {}) },
    orderBy: { createdAt: 'desc' },
    take,
  });
  if (DEBUG_CHATBOT) {
    void ErrorSystem.logInfo('Snapshots loaded', {
      service: 'agent-api',
      runId,
      count: snapshots.length,
      durationMs: Date.now() - requestStart,
    });
  }
  return NextResponse.json({ snapshots });
}

export const GET = apiHandlerWithParams<{ runId: string }>(
  async (req: NextRequest, _ctx, params) => GET_handler(req, { params: Promise.resolve(params) }),
  { source: 'chatbot.agent.[runId].snapshots.GET' }
);
