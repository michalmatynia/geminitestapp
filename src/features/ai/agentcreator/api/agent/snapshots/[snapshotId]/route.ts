import { type NextRequest, NextResponse } from 'next/server';

import { getAgentBrowserSnapshotDelegate } from '@/features/ai/agent-runtime/store-delegates';
import { internalError, notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams, type ApiHandlerContext } from '@/shared/lib/api/api-handler';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const DEBUG_CHATBOT = process.env['DEBUG_CHATBOT'] === 'true';

async function getHandler(
  _req: NextRequest,
  { params }: { params: Promise<{ snapshotId: string }> }
): Promise<Response> {
  const requestStart = Date.now();
  const agentBrowserSnapshot = getAgentBrowserSnapshotDelegate();
  if (!agentBrowserSnapshot) {
    throw internalError('Agent snapshot storage is unavailable.');
  }
  const { snapshotId } = await params;
  const snapshot = await agentBrowserSnapshot.findUnique({
    where: { id: snapshotId },
  });
  if (!snapshot) {
    throw notFoundError('Snapshot not found.');
  }
  if (DEBUG_CHATBOT) {
    void ErrorSystem.logInfo('Snapshot loaded', {
      service: 'agent-api',
      snapshotId,
      durationMs: Date.now() - requestStart,
    });
  }
  return NextResponse.json({ snapshot });
}

export const GET = apiHandlerWithParams<{ snapshotId: string }>(
  async (_req: NextRequest, _ctx: ApiHandlerContext, params: { snapshotId: string }) =>
    getHandler(_req, { params: Promise.resolve(params) }),
  { source: 'chatbot.agent.snapshots.[snapshotId].GET', requireAuth: true }
);
