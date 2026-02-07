import { NextRequest, NextResponse } from 'next/server';

import { internalError, notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import prisma from '@/shared/lib/db/prisma';

const DEBUG_CHATBOT = process.env.DEBUG_CHATBOT === 'true';

async function GET_handler(_req: NextRequest,
  { params }: { params: Promise<{ snapshotId: string }> }
): Promise<Response> {
  const requestStart = Date.now();
  if (!('agentBrowserSnapshot' in prisma)) {
    throw internalError(
      'Agent snapshots not initialized. Run prisma generate/db push.'
    );
  }
  const { snapshotId } = await params;
  const snapshot = await prisma.agentBrowserSnapshot.findUnique({
    where: { id: snapshotId },
  });
  if (!snapshot) {
    throw notFoundError('Snapshot not found.');
  }
  if (DEBUG_CHATBOT) {
    console.info('[chatbot][agent][snapshot] Loaded', {
      snapshotId,
      durationMs: Date.now() - requestStart,
    });
  }
  return NextResponse.json({ snapshot });
}

export const GET = apiHandlerWithParams<{ snapshotId: string }>(
  async (_req, _ctx, params) => GET_handler(_req, { params: Promise.resolve(params) }),
  { source: 'chatbot.agent.snapshots.[snapshotId].GET' }
);
