import { promises as fs } from 'fs';
import path from 'path';

import { type NextRequest, NextResponse } from 'next/server';

import { logAgentAudit } from '@/features/ai/agent-runtime/audit';
import {
  type AgentRuntimeRunRecord,
  getChatbotAgentRunDelegate,
} from '@/features/ai/agent-runtime/store-delegates';
import {
  conflictError,
  internalError,
  notFoundError,
} from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import {
  type AgentRunRouteRecord,
  handleAgentRunAction,
  parseAgentRunActionRequest,
} from './agent-run-actions';

const buildAgentCreatorSource = (action: string): string => `ai.agentcreator.run.${action}`;

const DEBUG_CHATBOT = process.env['DEBUG_CHATBOT'] === 'true';

async function getHandler(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
): Promise<Response> {
  const requestStart = Date.now();
  const chatbotAgentRun = getChatbotAgentRunDelegate();
  if (chatbotAgentRun === null) {
    throw internalError('Agent run storage is unavailable.', { service: 'agent-api', action: 'get' });
  }
  const { runId } = await params;
  const run = await chatbotAgentRun.findUnique<AgentRunRouteRecord>({
    where: { id: runId },
  });
  if (run === null) {
    throw notFoundError(
      `Agent run "${runId}" not found. The run may have expired or the id is incorrect.`,
      { runId }
    );
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
  if (chatbotAgentRun === null) {
    throw internalError('Agent run storage is unavailable.', { service: 'agent-api', action: 'post' });
  }
  const { runId } = await params;
  const body = await parseAgentRunActionRequest(req, runId);

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
  if (run === null) {
    throw notFoundError(
      `Agent run "${runId}" not found. The run may have expired or the id is incorrect.`
    );
  }

  return handleAgentRunAction({
    runId,
    body,
    run,
    storage: chatbotAgentRun,
    requestStart,
  });
}

async function deleteHandler(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
): Promise<Response> {
  const requestStart = Date.now();
  const chatbotAgentRun = getChatbotAgentRunDelegate();
  if (chatbotAgentRun === null) {
    throw internalError('Agent run storage is unavailable.');
  }
  const { runId } = await params;
  const run = await chatbotAgentRun.findUnique<Pick<AgentRuntimeRunRecord, 'status'>>({
    where: { id: runId },
  });
  if (run === null) {
    throw notFoundError(
      `Agent run "${runId}" not found. The run may have been deleted or the id is incorrect.`
    );
  }

  const force = new URL(req.url).searchParams.get('force') === 'true';
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
  await fs.rm(path.join(process.cwd(), 'tmp', 'chatbot-agent', runId), {
    recursive: true,
    force: true,
  });
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
