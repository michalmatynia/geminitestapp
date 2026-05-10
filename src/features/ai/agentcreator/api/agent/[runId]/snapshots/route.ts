import { type NextRequest, NextResponse } from 'next/server';

import { getAgentBrowserSnapshotDelegate } from '@/features/ai/agent-runtime/store-delegates';
import type {
  AgentBrowserSnapshotRecord,
  AgentBrowserSnapshotsResponse,
} from '@/shared/contracts/agent-runtime';
import { internalError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

/**
 * Builds a standardized source string for logging: 'ai.agentcreator.snapshot.<action>'
 */
const buildAgentCreatorSnapshotSource = (action: string): string => `ai.agentcreator.snapshot.${action}`;

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

const isNonEmptyString = (value: string | null): value is string =>
  value !== null && value.length > 0;

const buildSnapshotWhereClause = (
  runId: string,
  stepId: string | null
): { runId: string; stepId?: string } => {
  if (!isNonEmptyString(stepId)) {
    return { runId };
  }
  return { runId, stepId };
};

const toAgentBrowserSnapshotRecord = (
  snapshot: AgentBrowserSnapshotRouteRecord
): AgentBrowserSnapshotRecord => ({
  ...snapshot,
  title: snapshot.title,
  screenshotData: snapshot.screenshotData,
  screenshotPath: snapshot.screenshotPath,
  stepId: snapshot.stepId,
  mouseX: snapshot.mouseX,
  mouseY: snapshot.mouseY,
  viewportWidth: snapshot.viewportWidth,
  viewportHeight: snapshot.viewportHeight,
  createdAt:
    snapshot.createdAt instanceof Date ? snapshot.createdAt.toISOString() : snapshot.createdAt,
});

async function getHandler(
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
    where: buildSnapshotWhereClause(runId, stepId),
    orderBy: { createdAt: 'desc' },
    take,
  });
  if (DEBUG_CHATBOT) {
    void ErrorSystem.logInfo('Snapshots loaded', {
      service: buildAgentCreatorSnapshotSource('loaded'),
      runId,
      count: snapshots.length,
      durationMs: Date.now() - requestStart,
    });
  }
  const response: AgentBrowserSnapshotsResponse = {
    snapshots: snapshots.map(toAgentBrowserSnapshotRecord),
  };
  return NextResponse.json(response);
}

export const GET = apiHandlerWithParams<{ runId: string }>(
  async (req: NextRequest, _ctx, params) => getHandler(req, { params: Promise.resolve(params) }),
  { source: 'chatbot.agent.[runId].snapshots.GET', requireAuth: true }
);
