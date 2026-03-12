import { NextRequest, NextResponse } from 'next/server';

import { getAgentBrowserSnapshotDelegate } from '@/features/ai/agent-runtime/store-delegates';
import type {
  AgentBrowserSnapshotRecord,
  AgentBrowserSnapshotsResponse,
} from '@/shared/contracts/agent-runtime';
import { internalError } from '@/shared/errors/app-error';
import {
  apiHandlerWithParams,
  type ApiHandlerContext as _ApiHandlerContext,
} from '@/shared/lib/api/api-handler';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const DEBUG_CHATBOT = process.env['DEBUG_CHATBOT'] === 'true';

type AgentBrowserSnapshotRouteRecord = {
  id: string;
  runId: string;
  url: string;
  title: string | null;
  domHtml: string;
  domText: string;
  screenshotData: string | null;
  screenshotPath: string | null;
  stepId: string | null;
  mouseX: number | null;
  mouseY: number | null;
  viewportWidth: number | null;
  viewportHeight: number | null;
  createdAt: Date | string;
};

async function GET_handler(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
): Promise<Response> {
  const requestStart = Date.now();
  const agentBrowserSnapshot = getAgentBrowserSnapshotDelegate();
  if (!agentBrowserSnapshot) {
    throw internalError('Agent snapshot storage is unavailable.');
  }
  const { runId } = await params;
  const url = new URL(req.url);
  const stepId = url.searchParams.get('stepId');
  const limit = Number(url.searchParams.get('limit') ?? '12');
  const take = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 50) : 12;
  const snapshots = await agentBrowserSnapshot.findMany<AgentBrowserSnapshotRouteRecord>({
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
  const response: AgentBrowserSnapshotsResponse = {
    snapshots: snapshots.map(
      (snapshot: AgentBrowserSnapshotRouteRecord): AgentBrowserSnapshotRecord => ({
        ...snapshot,
        title: snapshot.title ?? null,
        screenshotData: snapshot.screenshotData ?? null,
        screenshotPath: snapshot.screenshotPath ?? null,
        stepId: snapshot.stepId ?? null,
        mouseX: snapshot.mouseX ?? null,
        mouseY: snapshot.mouseY ?? null,
        viewportWidth: snapshot.viewportWidth ?? null,
        viewportHeight: snapshot.viewportHeight ?? null,
        createdAt:
          snapshot.createdAt instanceof Date ? snapshot.createdAt.toISOString() : snapshot.createdAt,
      })
    ),
  };
  return NextResponse.json(response);
}

export const GET = apiHandlerWithParams<{ runId: string }>(
  async (req: NextRequest, _ctx, params) => GET_handler(req, { params: Promise.resolve(params) }),
  { source: 'chatbot.agent.[runId].snapshots.GET', requireAuth: true }
);
