import fs from 'node:fs/promises';
import path from 'node:path';

import { type NextRequest, NextResponse } from 'next/server';

import {
  type AgentRuntimeRunRecord,
  getChatbotAgentRunDelegate,
} from '@/features/ai/agent-runtime/store-delegates';
import { startAgentQueue } from '@/features/ai/agent-runtime/workers/agentQueue';
import type {
  AgentRunRecord,
  AgentRunStatusType,
  AgentRunsDeleteResponse,
  AgentRunsResponse,
} from '@/shared/contracts/agent-runtime';
import type { IdDto } from '@/shared/contracts/base';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, configurationError, internalError } from '@/shared/errors/app-error';
import { getBrainAssignmentForFeature } from '@/shared/lib/ai-brain/server';
import { apiHandler } from '@/shared/lib/api/api-handler';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { createAgentRun } from './agent-run-create';

const DEBUG_CHATBOT = process.env['DEBUG_CHATBOT'] === 'true';

type AgentRunListRecord = Pick<
  AgentRuntimeRunRecord,
  | 'id'
  | 'prompt'
  | 'model'
  | 'searchProvider'
  | 'agentBrowser'
  | 'status'
  | 'errorMessage'
  | 'recordingPath'
  | 'activeStepId'
> & {
  tools: string[];
  runHeadless: boolean;
  requiresHumanIntervention: boolean;
  logLines: string[];
  checkpointedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  _count: {
    browserSnapshots: number;
    browserLogs: number;
  };
};

type AgentRunIdRecord = IdDto;

const toIsoString = (value: Date | string | null): string | null => {
  if (value === null) {
    return null;
  }
  return value instanceof Date ? value.toISOString() : value;
};

async function getHandler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const requestStart = Date.now();
  startAgentQueue();
  const chatbotAgentRun = getChatbotAgentRunDelegate();
  if (!chatbotAgentRun) {
    throw internalError('Agent run storage is unavailable.');
  }
  const runs = await chatbotAgentRun.findMany<AgentRunListRecord>({
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      prompt: true,
      model: true,
      tools: true,
      searchProvider: true,
      agentBrowser: true,
      runHeadless: true,
      status: true,
      requiresHumanIntervention: true,
      errorMessage: true,
      logLines: true,
      recordingPath: true,
      activeStepId: true,
      checkpointedAt: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: { browserSnapshots: true, browserLogs: true },
      },
    },
  });
  if (DEBUG_CHATBOT) {
    void ErrorSystem.logInfo('Runs loaded', {
      service: 'agent-api',
      count: runs.length,
      durationMs: Date.now() - requestStart,
    });
  }
  const response: AgentRunsResponse = {
    runs: runs.map(
      (run: AgentRunListRecord): AgentRunRecord => ({
        ...run,
        checkpointedAt: toIsoString(run.checkpointedAt),
        createdAt: toIsoString(run.createdAt) ?? new Date().toISOString(),
        updatedAt: toIsoString(run.updatedAt) ?? new Date().toISOString(),
      })
    ),
  };
  return NextResponse.json(
    response,
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}

async function postHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const requestStart = Date.now();
  const chatbotAgentRun = getChatbotAgentRunDelegate();
  if (chatbotAgentRun === null) {
    throw internalError('Agent run storage is unavailable.');
  }
  const agentRuntimeBrain = await getBrainAssignmentForFeature('agent_runtime');
  if (!agentRuntimeBrain.enabled) {
    throw configurationError(
      'Agent Runtime is disabled in AI Brain. Enable it in /admin/brain?tab=routing before queuing runs.'
    );
  }
  const response = await createAgentRun(req, chatbotAgentRun);
  if (DEBUG_CHATBOT) {
    void ErrorSystem.logInfo('Queued', {
      service: 'agent-api',
      durationMs: Date.now() - requestStart,
    });
  }
  return NextResponse.json(response);
}

async function deleteHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const requestStart = Date.now();
  const chatbotAgentRun = getChatbotAgentRunDelegate();
  if (!chatbotAgentRun) {
    throw internalError('Agent run storage is unavailable.');
  }
  const url = new URL(req.url);
  const scope = url.searchParams.get('scope') ?? 'terminal';
  const terminalStatuses: AgentRunStatusType[] = [
    'completed',
    'failed',
    'stopped',
    'waiting_human',
  ];
  if (scope !== 'terminal') {
    throw badRequestError(`Unsupported delete scope "${scope}". The only supported scope is "terminal", which deletes all completed, failed, and stopped runs.`);
  }
  const runs = await chatbotAgentRun.findMany<AgentRunIdRecord>({
    where: { status: { in: terminalStatuses } },
    select: { id: true },
  });
  const ids = runs.map((run: AgentRunIdRecord) => run.id);
  if (ids.length === 0) {
    const response: AgentRunsDeleteResponse = { success: true, deletedCount: 0, deleted: 0 };
    return NextResponse.json(response);
  }
  await chatbotAgentRun.deleteMany({
    where: { id: { in: ids } },
  });
  await Promise.all(
    ids.map((runId: string) =>
      fs.rm(path.join(process.cwd(), 'tmp', 'chatbot-agent', runId), {
        recursive: true,
        force: true,
      })
    )
  );
  if (DEBUG_CHATBOT) {
    void ErrorSystem.logInfo('Deleted', {
      service: 'agent-api',
      count: ids.length,
      durationMs: Date.now() - requestStart,
    });
  }
  const response: AgentRunsDeleteResponse = {
    success: true,
    deletedCount: ids.length,
    deleted: ids.length,
  };
  return NextResponse.json(response);
}

export const GET = apiHandler(getHandler, {
  source: 'chatbot.agent.GET',
  requireAuth: true,
});
export const POST = apiHandler(postHandler, {
  source: 'chatbot.agent.POST',
  requireAuth: true,
});
export const DELETE = apiHandler(deleteHandler, {
  source: 'chatbot.agent.DELETE',
  requireAuth: true,
});
