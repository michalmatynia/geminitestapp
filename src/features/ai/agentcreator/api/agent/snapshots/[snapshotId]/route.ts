import { NextRequest, NextResponse } from 'next/server';

import { internalError, notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams, type ApiHandlerContext } from '@/shared/lib/api/api-handler';
import prisma from '@/shared/lib/db/prisma';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const DEBUG_CHATBOT = process.env['DEBUG_CHATBOT'] === 'true';

async function GET_handler(
  _req: NextRequest,
  { params }: { params: Promise<{ snapshotId: string }> }
): Promise<Response> {
  const requestStart = Date.now();
  if (!('agentBrowserSnapshot' in prisma)) {
    throw internalError('Agent snapshots not initialized. Run prisma generate/db push.');
  }
  const { snapshotId } = await params;
  const snapshot = await prisma.agentBrowserSnapshot.findUnique({
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
    GET_handler(_req, { params: Promise.resolve(params) }),
  { source: 'chatbot.agent.snapshots.[snapshotId].GET' }
);
