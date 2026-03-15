import fs from 'node:fs/promises';
import path from 'node:path';

import { NextRequest, NextResponse } from 'next/server';

import { logAgentAudit } from '@/features/ai/agent-runtime/audit';
import { resolveAgentRuntimeContextRegistryEnvelope } from '@/features/ai/agent-runtime/context-registry/server';
import {
  type AgentRuntimeRunRecord,
  getChatbotAgentRunDelegate,
} from '@/features/ai/agent-runtime/store-delegates';
import { startAgentQueue } from '@/features/ai/server';
import type {
  AgentRunEnqueueResponse,
  AgentRunRecord,
  AgentRunStatusType,
  AgentRunsDeleteResponse,
  AgentRunsResponse,
} from '@/shared/contracts/agent-runtime';
import { contextRegistryConsumerEnvelopeSchema } from '@/shared/contracts/ai-context-registry';
import type { InputJsonValue } from '@/shared/contracts/json';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, configurationError, internalError } from '@/shared/errors/app-error';
import { getBrainAssignmentForFeature } from '@/shared/lib/ai-brain/server';
import { apiHandler } from '@/shared/lib/api/api-handler';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

export const dynamic = 'force-dynamic';

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

type AgentRunCreateRecord = Pick<
  AgentRuntimeRunRecord,
  'id' | 'model' | 'searchProvider' | 'agentBrowser' | 'status'
> & {
  tools: string[];
};

type AgentRunIdRecord = {
  id: string;
};

const toIsoString = (value: Date | string | null): string | null => {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
};

async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
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

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const requestStart = Date.now();
  const chatbotAgentRun = getChatbotAgentRunDelegate();
  if (!chatbotAgentRun) {
    throw internalError('Agent run storage is unavailable.');
  }
  const agentRuntimeBrain = await getBrainAssignmentForFeature('agent_runtime');
  if (!agentRuntimeBrain.enabled) {
    throw configurationError(
      'Agent Runtime is disabled in AI Brain. Enable it in /admin/brain?tab=routing before queuing runs.'
    );
  }
  let body: {
    prompt?: string;
    model?: string;
    personaId?: string;
    tools?: string[];
    searchProvider?: string;
    agentBrowser?: string;
    runHeadless?: boolean;
    ignoreRobotsTxt?: boolean;
    requireHumanApproval?: boolean;
    contextRegistry?: unknown;
    planSettings?: {
      maxSteps?: number;
      maxStepAttempts?: number;
      maxReplanCalls?: number;
      replanEverySteps?: number;
      maxSelfChecks?: number;
      loopGuardThreshold?: number;
      loopBackoffBaseMs?: number;
      loopBackoffMaxMs?: number;
    };
  };

  try {
    body = (await req.json()) as typeof body;
  } catch (error) {
    void ErrorSystem.captureException(error);
    throw badRequestError('Invalid JSON payload');
  }

  if (!body.prompt?.trim()) {
    throw badRequestError('Prompt is required.');
  }
  let contextRegistry = null;
  if (body.contextRegistry !== undefined) {
    const parsedContextRegistry = contextRegistryConsumerEnvelopeSchema.safeParse(
      body.contextRegistry
    );
    if (!parsedContextRegistry.success) {
      throw badRequestError('Invalid context registry payload.');
    }
    contextRegistry = await resolveAgentRuntimeContextRegistryEnvelope(parsedContextRegistry.data);
  }
  const normalizePlanSettings = (input?: {
    maxSteps?: number;
    maxStepAttempts?: number;
    maxReplanCalls?: number;
    replanEverySteps?: number;
    maxSelfChecks?: number;
    loopGuardThreshold?: number;
    loopBackoffBaseMs?: number;
    loopBackoffMaxMs?: number;
  }) => {
    if (!input) return null;
    const clampInt = (value: unknown, min: number, max: number, fallback: number) => {
      const numeric =
        typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
      if (!Number.isFinite(numeric)) return fallback;
      return Math.min(Math.max(Math.round(numeric), min), max);
    };
    return {
      maxSteps: clampInt(input.maxSteps, 1, 20, 12),
      maxStepAttempts: clampInt(input.maxStepAttempts, 1, 5, 2),
      maxReplanCalls: clampInt(input.maxReplanCalls, 0, 6, 2),
      replanEverySteps: clampInt(input.replanEverySteps, 1, 10, 2),
      maxSelfChecks: clampInt(input.maxSelfChecks, 0, 8, 4),
      loopGuardThreshold: clampInt(input.loopGuardThreshold, 1, 5, 2),
      loopBackoffBaseMs: clampInt(input.loopBackoffBaseMs, 250, 20000, 2000),
      loopBackoffMaxMs: clampInt(input.loopBackoffMaxMs, 1000, 60000, 12000),
    };
  };

  const planSettings = normalizePlanSettings(body.planSettings);

  if (DEBUG_CHATBOT) {
    void ErrorSystem.logInfo('Request', {
      service: 'agent-api',
      promptLength: body.prompt.trim().length,
      model: body.model?.trim() || null,
      personaId: body.personaId?.trim() || null,
      tools: body.tools ?? [],
      searchProvider: body.searchProvider?.trim() || null,
      agentBrowser: body.agentBrowser?.trim() || null,
      runHeadless: body.runHeadless ?? true,
      ignoreRobotsTxt: body.ignoreRobotsTxt ?? false,
      requireHumanApproval: body.requireHumanApproval ?? false,
      contextRegistryRefCount: contextRegistry?.refs.length ?? 0,
      contextRegistryDocumentCount: contextRegistry?.resolved?.documents.length ?? 0,
      planSettings,
    });
  }

  const hasPreferenceOverrides =
    body.ignoreRobotsTxt !== undefined || body.requireHumanApproval !== undefined;
  const shouldAttachPlanState = Boolean(planSettings || hasPreferenceOverrides || contextRegistry);

  const run = await chatbotAgentRun.create<AgentRunCreateRecord>({
    data: {
      prompt: body.prompt.trim(),
      model: body.model?.trim() || null,
      personaId: body.personaId?.trim() || null,
      tools: body.tools ?? [],
      searchProvider: body.searchProvider?.trim() || null,
      agentBrowser: body.agentBrowser?.trim() || null,
      runHeadless: body.runHeadless ?? true,
      logLines: [`[${new Date().toISOString()}] Run queued.`],
      ...(shouldAttachPlanState
        ? {
          planState: {
            ...(planSettings ? { settings: planSettings } : {}),
            preferences: {
              ignoreRobotsTxt: Boolean(body.ignoreRobotsTxt),
              requireHumanApproval: Boolean(body.requireHumanApproval),
            },
            ...(contextRegistry ? { contextRegistry } : {}),
          } as InputJsonValue,
        }
        : {}),
    },
  });
  await logAgentAudit(run.id, 'info', 'Agent run queued.', {
    model: run.model,
    tools: run.tools,
    searchProvider: run.searchProvider,
    agentBrowser: run.agentBrowser,
  });

  startAgentQueue();

  if (DEBUG_CHATBOT) {
    void ErrorSystem.logInfo('Queued', {
      service: 'agent-api',
      runId: run.id,
      status: run.status,
      durationMs: Date.now() - requestStart,
    });
  }

  const response: AgentRunEnqueueResponse = { runId: run.id, status: run.status };
  return NextResponse.json(response);
}

async function DELETE_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
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
    throw badRequestError('Unsupported delete scope.');
  }
  const runs = await chatbotAgentRun.findMany<AgentRunIdRecord>({
    where: { status: { in: terminalStatuses } },
    select: { id: true },
  });
  const ids = runs.map((run: AgentRunIdRecord) => run.id);
  if (ids.length === 0) {
    const response: AgentRunsDeleteResponse = { deleted: 0 };
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
  const response: AgentRunsDeleteResponse = { deleted: ids.length };
  return NextResponse.json(response);
}

export const GET = apiHandler(GET_handler, {
  source: 'chatbot.agent.GET',
  requireAuth: true,
});
export const POST = apiHandler(POST_handler, {
  source: 'chatbot.agent.POST',
  requireAuth: true,
});
export const DELETE = apiHandler(DELETE_handler, {
  source: 'chatbot.agent.DELETE',
  requireAuth: true,
});
