import { NextRequest, NextResponse } from 'next/server';

import { ErrorSystem } from '@/features/observability/server';
import { internalError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import prisma from '@/shared/lib/db/prisma';

const DEBUG_CHATBOT = process.env['DEBUG_CHATBOT'] === 'true';

async function GET_handler(req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
): Promise<Response> {
  const requestStart = Date.now();
  if (!('agentBrowserLog' in prisma)) {
    throw internalError(
      'Agent logs not initialized. Run prisma generate/db push.'
    );
  }
  const { runId } = await params;
  const { searchParams } = new URL(req.url);
  const stepId = searchParams.get('stepId');
  const logs = await prisma.agentBrowserLog.findMany({
    where: stepId ? { runId, stepId } : { runId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  if (DEBUG_CHATBOT) {
    void ErrorSystem.logInfo('Logs loaded', {
      service: 'agent-api',
      runId,
      stepId,
      count: logs.length,
      durationMs: Date.now() - requestStart,
    });
  }
  return NextResponse.json({ logs });
}

export const GET = apiHandlerWithParams<{ runId: string }>(
  async (req: any, _ctx: any, params: any) => GET_handler(req, { params: Promise.resolve(params) }),
  { source: 'chatbot.agent.[runId].logs.GET' }
);
