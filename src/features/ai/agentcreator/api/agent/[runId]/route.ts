import { promises as fs } from 'fs';
import path from 'path';

import { type NextRequest, NextResponse } from 'next/server';

import { logAgentAudit } from '@/features/ai/agent-runtime/audit';
import {
  type AgentRuntimeRunRecord,
  getChatbotAgentRunDelegate,
} from '@/features/ai/agent-runtime/store-delegates';
import {
  badRequestError,
  conflictError,
  internalError,
  notFoundError,
} from '@/shared/errors/app-error';
import {
  apiHandlerWithParams,
  type ApiHandlerContext as _ApiHandlerContext,
} from '@/shared/lib/api/api-handler';
import type { InputJsonValue } from '@/shared/contracts/json';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

/**
 * Builds a standardized source string for logging: 'ai.agentcreator.run.<action>'
 */
const buildAgentCreatorSource = (action: string): string => `ai.agentcreator.run.${action}`;
import { logClientError } from '@/shared/utils/observability/client-error-logger';


const DEBUG_CHATBOT = process.env['DEBUG_CHATBOT'] === 'true';

type AgentRunRouteRecord = Pick<
  AgentRuntimeRunRecord,
  'id' | 'prompt' | 'status' | 'planState'
> & {
  checkpointedAt?: Date | string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  logLines?: string[];
};

type AgentRunStatusRecord = Pick<AgentRuntimeRunRecord, 'id' | 'status'>;

async function getHandler(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
): Promise<Response> {
  const requestStart = Date.now();
  const chatbotAgentRun = getChatbotAgentRunDelegate();
  if (!chatbotAgentRun) {
    throw internalError('Agent run storage is unavailable.', { service: 'agent-api', action: 'get' });
  }
  const { runId } = await params;
  const run = await chatbotAgentRun.findUnique<AgentRunRouteRecord>({
    where: { id: runId },
  });
  if (!run) {
    throw notFoundError(`Agent run "${runId}" not found. The run may have expired or the id is incorrect.`, { runId });
  }
  if (DEBUG_CHATBOT) {
    void ErrorSystem.logInfo('Run loaded', {
      service: buildAgentCreatorSource('run-loaded'),
      runId,
      status: run.status,
      durationMs: Date.now() - requestStart,
    });
  }
  return NextResponse.json({ run });
}

async function postHandler(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
): Promise<Response> {
  const requestStart = Date.now();
  const chatbotAgentRun = getChatbotAgentRunDelegate();
  if (!chatbotAgentRun) {
    throw internalError('Agent run storage is unavailable.', { service: 'agent-api', action: 'post' });
  }
  const { runId } = await params;
  let body: {
    action?: string;
    stepId?: string;
    status?: 'completed' | 'failed' | 'pending';
    prompt?: string;
  };

  try {
    body = (await req.json()) as typeof body;
  } catch (error) {
    logClientError(error);
    throw badRequestError('Invalid JSON payload. The request body must be a valid JSON object.', {
      runId,
      cause: error,
    });
  }
  if (
    !body.action ||
    !['stop', 'resume', 'retry_step', 'override_step', 'approve_step'].includes(body.action)
  ) {
    throw badRequestError(`Unsupported action "${body.action ?? ''}". Allowed actions are: stop, resume, retry_step, override_step, approve_step.`, {
      runId,
      action: body.action,
    });
  }
  if (DEBUG_CHATBOT) {
    void ErrorSystem.logInfo('Request', {
      service: buildAgentCreatorSource('request'),
      runId,
      action: body.action,
    });
  }

  const run = await chatbotAgentRun.findUnique<AgentRunRouteRecord>({
    where: { id: runId },
  });

  if (!run) {
    throw notFoundError(`Agent run "${runId}" not found. The run may have expired or the id is incorrect.`);
  }

async function handleResumeAction(args: {
  id: string;
  payload: { prompt?: string; stepId?: string };
  agentRun: AgentRunRouteRecord;
  storage: any;
  start: number
}): Promise<Response> {
  const { id, payload, agentRun, storage, start } = args;

  if (agentRun.status === 'running') {
    return NextResponse.json({ status: agentRun.status });
  }

  const nextPrompt = (typeof payload.prompt === 'string' && payload.prompt.trim() !== '') ? payload.prompt.trim() : null;
  const resumeStepId = (typeof payload.stepId === 'string' && payload.stepId.trim() !== '') ? payload.stepId.trim() : null;

  const resumePlanState =
    (agentRun.planState !== null && typeof agentRun.planState === 'object')
      ? {
        ...(agentRun.planState as Record<string, unknown>),
        resumeRequestedAt: new Date().toISOString(),
        ...(nextPrompt !== null && { promptUpdatedAt: new Date().toISOString() }),
        ...(resumeStepId !== null && { activeStepId: resumeStepId }),
      }
      : {
        resumeRequestedAt: new Date().toISOString(),
        ...(nextPrompt !== null && { promptUpdatedAt: new Date().toISOString() }),
        ...(resumeStepId !== null && { activeStepId: resumeStepId }),
      };

  const updated = await storage.update<AgentRunStatusRecord>({
    where: { id: id },
    data: {
      status: 'queued',
      requiresHumanIntervention: false,
      errorMessage: null,
      finishedAt: null,
      checkpointedAt: new Date(),
      planState: resumePlanState as InputJsonValue,
      ...(resumeStepId !== null && { activeStepId: resumeStepId }),
      ...(nextPrompt !== null && { prompt: nextPrompt }),
      logLines: {
        push: `[${new Date().toISOString()}] Run resume requested.`,
      },
    },
  });

  if (nextPrompt !== null && nextPrompt !== agentRun.prompt) {
    await logAgentAudit(updated.id, 'warning', 'Agent prompt updated.', {
      promptLength: nextPrompt.length,
    });
  }
  await logAgentAudit(updated.id, 'info', 'Agent run resume requested.');
  if (DEBUG_CHATBOT) {
    void ErrorSystem.logInfo('Resumed', {
      service: 'agent-api',
      runId: id,
      status: updated.status,
      durationMs: Date.now() - start,
    });
  }
  return NextResponse.json({ status: updated.status });
}

// ... inside postHandler ...
  if (body.action === 'resume') {
    return await handleResumeAction({ id: runId, payload: body, agentRun: run, storage: chatbotAgentRun, start: requestStart });
  }




async function handleRetryStepAction(args: {
  id: string;
  payload: { stepId?: string };
  agentRun: AgentRunRouteRecord;
  storage: any;
}): Promise<Response> {
  const { id, payload, agentRun, storage } = args;

  if (agentRun.status === 'running') {
    throw conflictError('Run is running. Stop it before retrying steps.');
  }
  const stepId = (typeof payload.stepId === 'string' && payload.stepId.trim() !== '') ? payload.stepId.trim() : null;
  if (stepId === null) {
    throw badRequestError('stepId is required for retry_step. Provide the id of the step to retry.');
  }
  
  const planState = (agentRun.planState !== null && typeof agentRun.planState === 'object') ? (agentRun.planState as Record<string, unknown>) : null;
  const steps = Array.isArray(planState?.['steps']) ? (planState?.['steps'] as Array<Record<string, unknown>>) : null;
  if (steps === null) {
    throw badRequestError(`No plan steps available to retry for run "${id}".`);
  }
  
  const nextSteps = steps.map((step) => {
    if (step !== null && typeof step === 'object' && step['id'] === stepId) {
      const typed = step as {
        id: string;
        status?: string;
        attempts?: number;
        maxAttempts?: number;
      };
      return {
        ...typed,
        status: 'pending',
        attempts: 0,
        maxAttempts: (typeof typed.maxAttempts === 'number' ? typed.maxAttempts : 1) + 1,
      };
    }
    return step;
  });
  
  const now = new Date().toISOString();
  const nextPlanState = {
    ...(planState ?? {}),
    steps: nextSteps,
    activeStepId: stepId,
    resumeRequestedAt: now,
    updatedAt: now,
  };
  
  await storage.update<AgentRunStatusRecord>({
    where: { id: id },
    data: {
      status: 'queued',
      requiresHumanIntervention: false,
      errorMessage: null,
      finishedAt: null,
      checkpointedAt: new Date(),
      planState: nextPlanState as InputJsonValue,
      activeStepId: stepId,
      logLines: {
        push: `[${new Date().toISOString()}] Step retry requested (${stepId}).`,
      },
    },
  });
  return NextResponse.json({ status: 'queued' });
  }

  // ... inside postHandler ...
  if (body.action === 'retry_step') {
    return await handleRetryStepAction({ id: runId, payload: body, agentRun: run, storage: chatbotAgentRun });
  }

  if (body.action === 'stop') {

    return NextResponse.json({ status: updated.status });
  }

async function handleOverrideStepAction(args: {
  id: string;
  payload: { stepId?: string; status?: string };
  agentRun: AgentRunRouteRecord;
  storage: any;
}): Promise<Response> {
  const { id, payload, agentRun, storage } = args;

  if (agentRun.status === 'running') {
    throw conflictError('Run is running. Stop it before overriding steps.');
  }
  const stepId = (typeof payload.stepId === 'string' && payload.stepId.trim() !== '') ? payload.stepId.trim() : null;
  const status = (typeof payload.status === 'string' && payload.status.trim() !== '') ? payload.status.trim() : null;
  
  if (stepId === null || status === null) {
    throw badRequestError('stepId and status are required for override_step.');
  }

  const planState = (agentRun.planState !== null && typeof agentRun.planState === 'object') ? (agentRun.planState as Record<string, unknown>) : null;
  const steps = Array.isArray(planState?.['steps']) ? (planState?.['steps'] as Array<Record<string, unknown>>) : null;
  
  if (steps === null) {
    throw badRequestError(`No plan steps available to override for run "${id}".`);
  }

  const nextSteps = steps.map((step) => {
    if (step !== null && typeof step === 'object' && step['id'] === stepId) {
      return { ...step, status };
    }
    return step;
  });
  
  const nextActive = (status === 'completed')
    ? (nextSteps.find((s) => (s !== null && typeof s === 'object' && (s as { status?: string }).status !== 'completed')) as { id?: string } | undefined)?.id ?? null
    : stepId;
  
  const now = new Date().toISOString();
  const nextPlanState = {
    ...(planState ?? {}),
    steps: nextSteps,
    activeStepId: nextActive,
    updatedAt: now,
  };
  
  const updated = await storage.update<AgentRunStatusRecord>({
    where: { id },
    data: {
      planState: nextPlanState as InputJsonValue,
      activeStepId: nextActive,
      checkpointedAt: new Date(),
      logLines: {
        push: `[${now}] Step overridden (${stepId} -> ${status}).`,
      },
    },
  });
  
  await logAgentAudit(updated.id, 'warning', 'Step overridden.', {
    stepId,
    status,
  });

  if (DEBUG_CHATBOT) {
    void ErrorSystem.logInfo('Step overridden', {
      service: 'agent-api',
      runId: id,
      stepId,
      status,
    });
  }
  
  return NextResponse.json({ status: updated.status });
}

// ... inside postHandler ...
  if (body.action === 'override_step') {
    return await handleOverrideStepAction({ id: runId, payload: body, agentRun: run, storage: chatbotAgentRun });
  }


import { 
  type AgentRunRouteRecord, 
  type AgentRunStatusRecord,
  type AgentRuntimeRunDelegate 
} from '@/features/ai/agent-runtime/store-delegates';

async function handleApproveStepAction(args: {
  id: string;
  payload: { stepId?: string };
  agentRun: AgentRunRouteRecord;
  storage: AgentRuntimeRunDelegate;
}): Promise<Response> {
  const { id, payload, agentRun, storage } = args;

  if (agentRun.status === 'running') {
    throw conflictError('Run is running. Stop it before approving steps.');
  }
  const stepId = (typeof payload.stepId === 'string' && payload.stepId.trim() !== '') ? payload.stepId.trim() : null;
  if (stepId === null) {
    throw badRequestError('stepId is required for approve_step.');
  }

  const planState = (agentRun.planState !== null && typeof agentRun.planState === 'object') ? (agentRun.planState as Record<string, unknown>) : null;
  const now = new Date().toISOString();
  
  const updated = await storage.update<AgentRunStatusRecord>({
    where: { id },
    data: {
      status: 'queued',
      requiresHumanIntervention: false,
      errorMessage: null,
      finishedAt: null,
      checkpointedAt: new Date(),
      planState: {
        ...(planState ?? {}),
        approvalRequestedStepId: null,
        approvalGrantedStepId: stepId,
        activeStepId: stepId,
        updatedAt: now,
      } as InputJsonValue,
      activeStepId: stepId,
      logLines: {
        push: `[${now}] Step approval granted (${stepId}).`,
      },
    },
  });

  await logAgentAudit(updated.id, 'warning', 'Step approval granted.', {
    stepId,
  });

  if (DEBUG_CHATBOT) {
    void ErrorSystem.logInfo('Step approved', {
      service: 'agent-api',
      runId: id,
      stepId,
    });
  }
  
  return NextResponse.json({ status: updated.status });
}


// ... inside postHandler ...
  if (body.action === 'approve_step') {
    return await handleApproveStepAction({ id: runId, payload: body, agentRun: run, storage: chatbotAgentRun });
  }


  if (run.status === 'completed' || run.status === 'failed' || run.status === 'stopped') {
    if (DEBUG_CHATBOT) {
      void ErrorSystem.logInfo('Already terminal', {
        service: 'agent-api',
        runId,
        status: run.status,
        durationMs: Date.now() - requestStart,
      });
    }
    return NextResponse.json({ status: run.status });
  }

async function handleStopAction(args: {
  id: string;
  storage: any;
  start: number
}): Promise<Response> {
  const { id, storage, start } = args;

  const updated = await storage.update<AgentRunStatusRecord>({
    where: { id },
    data: {
      status: 'stopped',
      finishedAt: new Date(),
      logLines: {
        push: `[${new Date().toISOString()}] Run stopped by user.`,
      },
    },
  });
  
  await logAgentAudit(updated.id, 'warning', 'Agent run stopped by user.');
  if (DEBUG_CHATBOT) {
    void ErrorSystem.logInfo('Stopped', {
      service: 'agent-api',
      runId: id,
      status: updated.status,
      durationMs: Date.now() - start,
    });
  }
  return NextResponse.json({ status: updated.status });
}

// ... in postHandler ...
  if (body.action === 'stop') {
    return await handleStopAction({ id: runId, storage: chatbotAgentRun, start: requestStart });
  }

  throw badRequestError(`Unsupported action "${body.action ?? ''}".`);
}

async function deleteHandler(

  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
): Promise<Response> {
  const requestStart = Date.now();
  const chatbotAgentRun = getChatbotAgentRunDelegate();
  if (!chatbotAgentRun) {
    throw internalError('Agent run storage is unavailable.');
  }
  const { runId } = await params;
  const run = await chatbotAgentRun.findUnique<Pick<AgentRuntimeRunRecord, 'status'>>({
    where: { id: runId },
  });
  if (!run) {
    throw notFoundError(`Agent run "${runId}" not found. The run may have been deleted or the id is incorrect.`);
  }
  const url = new URL(req.url);
  const force = url.searchParams.get('force') === 'true';
  if (run.status === 'running' && !force) {
    throw conflictError('Run is running. Stop it before deleting.');
  }
  if (run.status === 'running' && force) {
    await chatbotAgentRun.update({
      where: { id: runId },
      data: { status: 'stopped', finishedAt: new Date() },
    });
  }
  await chatbotAgentRun.delete({ where: { id: runId } });
  const runDir = path.join(process.cwd(), 'tmp', 'chatbot-agent', runId);
  await fs.rm(runDir, { recursive: true, force: true });
  await logAgentAudit(runId, 'warning', 'Agent run deleted.', {
    deletedAt: new Date().toISOString(),
  });
  if (DEBUG_CHATBOT) {
    void ErrorSystem.logInfo('Deleted', {
      service: 'agent-api',
      runId,
      durationMs: Date.now() - requestStart,
    });
  }
  return NextResponse.json({ deleted: true });
}

export const GET = apiHandlerWithParams<{ runId: string }>(
  async (req: NextRequest, _ctx, params) => getHandler(req, { params: Promise.resolve(params) }),
  { source: 'chatbot.agent.[runId].GET', requireAuth: true }
);
export const POST = apiHandlerWithParams<{ runId: string }>(
  async (req: NextRequest, _ctx, params) => postHandler(req, { params: Promise.resolve(params) }),
  { source: 'chatbot.agent.[runId].POST', requireAuth: true }
);
export const DELETE = apiHandlerWithParams<{ runId: string }>(
  async (req: NextRequest, _ctx, params) =>
    deleteHandler(req, { params: Promise.resolve(params) }),
  { source: 'chatbot.agent.[runId].DELETE', requireAuth: true }
);
