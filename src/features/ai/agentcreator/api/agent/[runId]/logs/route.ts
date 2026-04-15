import { type NextRequest, NextResponse } from 'next/server';

import { getAgentBrowserLogDelegate } from '@/features/ai/agent-runtime/store-delegates';
import type {
  AgentBrowserLogRecord,
  AgentBrowserLogsResponse,
} from '@/shared/contracts/agent-runtime';
import { internalError } from '@/shared/errors/app-error';
import {
  apiHandlerWithParams,
  type ApiHandlerContext as _ApiHandlerContext,
} from '@/shared/lib/api/api-handler';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const DEBUG_CHATBOT = process.env['DEBUG_CHATBOT'] === 'true';

type AgentBrowserLogRouteRecord = {
  id: string;
  runId: string;
  stepId: string | null;
  level: string;
  message: string;
  metadata?: unknown;
  createdAt: Date | string;
};

async function GET_handler(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
): Promise<Response> {
  const requestStart = Date.now();
  const agentBrowserLog = getAgentBrowserLogDelegate();
  if (!agentBrowserLog) {
    throw internalError('Agent log storage is unavailable.');
  }
  const { runId } = await params;
  const { searchParams } = new URL(req.url);
  const stepId = searchParams.get('stepId');
  const logs = await agentBrowserLog.findMany<AgentBrowserLogRouteRecord>({
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
  const response: AgentBrowserLogsResponse = {
    logs: logs.map(
      (log: AgentBrowserLogRouteRecord): AgentBrowserLogRecord => ({
        ...log,
        stepId: log.stepId ?? null,
        metadata: log.metadata ?? null,
        createdAt: log.createdAt instanceof Date ? log.createdAt.toISOString() : log.createdAt,
      })
    ),
  };
  return NextResponse.json(response);
}

export const GET = apiHandlerWithParams<{ runId: string }>(
  async (req: NextRequest, _ctx, params) => GET_handler(req, { params: Promise.resolve(params) }),
  { source: 'chatbot.agent.[runId].logs.GET', requireAuth: true }
);
