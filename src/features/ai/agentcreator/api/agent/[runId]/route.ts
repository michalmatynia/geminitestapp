import { promises as fs } from 'fs';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';

import { logAgentAudit } from '@/features/ai/agent-runtime/server';
import { startAgentQueue } from '@/features/jobs/server';
import {
  badRequestError,
  conflictError,
  internalError,
  notFoundError,
} from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import { createErrorResponse } from '@/shared/lib/api/handle-api-error';
import prisma from '@/shared/lib/db/prisma';

import type { Prisma } from '@prisma/client';

const DEBUG_CHATBOT = process.env.DEBUG_CHATBOT === 'true';

async function GET_handler(req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
): Promise<Response> {
  const requestStart = Date.now();
  try {
    startAgentQueue();
    if (!('chatbotAgentRun' in prisma)) {
      return createErrorResponse(
        internalError(
          'Agent runs not initialized. Run prisma generate/db push.'
        ),
        { request: req, source: 'chatbot.agent.[runId].GET' }
      );
    }
    const { runId } = await params;
    const run = await prisma.chatbotAgentRun.findUnique({
      where: { id: runId },
    });
    if (!run) {
      return createErrorResponse(notFoundError('Run not found.'), {
        request: req,
        source: 'chatbot.agent.[runId].GET',
      });
    }
    if (DEBUG_CHATBOT) {
      console.info('[chatbot][agent][GET] Run loaded', {
        runId,
        status: run.status,
        durationMs: Date.now() - requestStart,
      });
    }
    return NextResponse.json({ run });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: 'chatbot.agent.[runId].GET',
      fallbackMessage: 'Failed to load agent run.',
    });
  }
}

async function POST_handler(req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
): Promise<Response> {
  const requestStart = Date.now();
  try {
    if (!('chatbotAgentRun' in prisma)) {
      return createErrorResponse(
        internalError(
          'Agent runs not initialized. Run prisma generate/db push.'
        ),
        { request: req, source: 'chatbot.agent.[runId].POST' }
      );
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
    } catch (_error) {
      return createErrorResponse(badRequestError('Invalid JSON payload'), {
        request: req,
        source: 'chatbot.agent.[runId].POST',
      });
    }
    if (
      !body.action ||
      !['stop', 'resume', 'retry_step', 'override_step', 'approve_step'].includes(
        body.action
      )
    ) {
      return createErrorResponse(badRequestError('Unsupported action.'), {
        request: req,
        source: 'chatbot.agent.[runId].POST',
      });
    }
    if (DEBUG_CHATBOT) {
      console.info('[chatbot][agent][POST] Request', {
        runId,
        action: body.action,
      });
    }

    const run = await prisma.chatbotAgentRun.findUnique({
      where: { id: runId },
    });

    if (!run) {
      return createErrorResponse(notFoundError('Run not found.'), {
        request: req,
        source: 'chatbot.agent.[runId].POST',
      });
    }

    if (body.action === 'resume') {
      if (run.status === 'running') {
        return NextResponse.json({ status: run.status });
      }
      const nextPrompt =
        typeof body.prompt === 'string' && body.prompt.trim()
          ? body.prompt.trim()
          : null;
      const resumeStepId =
        typeof body.stepId === 'string' && body.stepId.trim()
          ? body.stepId.trim()
          : null;
      const resumePlanState =
        run.planState && typeof run.planState === 'object'
          ? {
            ...(run.planState as Record<string, unknown>),
            resumeRequestedAt: new Date().toISOString(),
            ...(nextPrompt ? { promptUpdatedAt: new Date().toISOString() } : {}),
            ...(resumeStepId ? { activeStepId: resumeStepId } : {}),
          }
          : {
            resumeRequestedAt: new Date().toISOString(),
            ...(nextPrompt ? { promptUpdatedAt: new Date().toISOString() } : {}),
            ...(resumeStepId ? { activeStepId: resumeStepId } : {}),
          };
      const updated = await prisma.chatbotAgentRun.update({
        where: { id: runId },
        data: {
          status: 'queued',
          requiresHumanIntervention: false,
          errorMessage: null,
          finishedAt: null,
          checkpointedAt: new Date(),
          planState: resumePlanState,
          ...(resumeStepId ? { activeStepId: resumeStepId } : {}),
          ...(nextPrompt ? { prompt: nextPrompt } : {}),
          logLines: {
            push: `[${new Date().toISOString()}] Run resume requested.`,
          },
        },
      });
      if (nextPrompt && nextPrompt !== run.prompt) {
        await logAgentAudit(updated.id, 'warning', 'Agent prompt updated.', {
          promptLength: nextPrompt.length,
        });
      }
      await logAgentAudit(updated.id, 'info', 'Agent run resume requested.');
      if (DEBUG_CHATBOT) {
        console.info('[chatbot][agent][POST] Resumed', {
          runId,
          status: updated.status,
          durationMs: Date.now() - requestStart,
        });
      }
      return NextResponse.json({ status: updated.status });
    }

    if (body.action === 'retry_step') {
      if (run.status === 'running') {
        return createErrorResponse(
          conflictError('Run is running. Stop it before retrying steps.'),
          { request: req, source: 'chatbot.agent.[runId].POST' }
        );
      }
      if (!body.stepId?.trim()) {
        return createErrorResponse(
          badRequestError('stepId is required for retry_step.'),
          { request: req, source: 'chatbot.agent.[runId].POST' }
        );
      }
      const planState =
        run.planState && typeof run.planState === 'object'
          ? (run.planState as Record<string, unknown>)
          : null;
      const steps = Array.isArray(planState?.steps)
        ? (planState.steps as Array<Record<string, unknown>>)
        : null;
      if (!steps) {
        return createErrorResponse(
          badRequestError('No plan steps available to retry.'),
          { request: req, source: 'chatbot.agent.[runId].POST' }
        );
      }
      const nextSteps = steps.map((step) => {
        if (step && typeof step === 'object' && step.id === body.stepId) {
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
            maxAttempts: (typed.maxAttempts ?? 1) + 1,
          };
        }
        return step;
      });
      const now = new Date().toISOString();
      const nextPlanState = {
        ...(planState ?? {}),
        steps: nextSteps,
        activeStepId: body.stepId,
        resumeRequestedAt: now,
        updatedAt: now,
      };
      const updated = await prisma.chatbotAgentRun.update({
        where: { id: runId },
        data: {
          status: 'queued',
          requiresHumanIntervention: false,
          errorMessage: null,
          finishedAt: null,
          checkpointedAt: new Date(),
          planState: nextPlanState as Prisma.InputJsonValue,
          activeStepId: body.stepId,
          logLines: {
            push: `[${new Date().toISOString()}] Step retry requested (${body.stepId}).`,
          },
        },
      });
      await logAgentAudit(updated.id, 'warning', 'Step retry requested.', {
        stepId: body.stepId,
      });
      if (DEBUG_CHATBOT) {
        console.info('[chatbot][agent][POST] Step retry queued', {
          runId,
          stepId: body.stepId,
          durationMs: Date.now() - requestStart,
        });
      }
      return NextResponse.json({ status: updated.status });
    }

    if (body.action === 'override_step') {
      if (run.status === 'running') {
        return createErrorResponse(
          conflictError('Run is running. Stop it before overriding steps.'),
          { request: req, source: 'chatbot.agent.[runId].POST' }
        );
      }
      if (!body.stepId?.trim() || !body.status) {
        return createErrorResponse(
          badRequestError('stepId and status are required for override_step.'),
          { request: req, source: 'chatbot.agent.[runId].POST' }
        );
      }
      const planState =
        run.planState && typeof run.planState === 'object'
          ? (run.planState as Record<string, unknown>)
          : null;
      const steps = Array.isArray(planState?.steps)
        ? (planState.steps as Array<Record<string, unknown>>)
        : null;
      if (!steps) {
        return createErrorResponse(
          badRequestError('No plan steps available to override.'),
          { request: req, source: 'chatbot.agent.[runId].POST' }
        );
      }
      const nextSteps = steps.map((step) => {
        if (step && typeof step === 'object' && step.id === body.stepId) {
          return { ...step, status: body.status };
        }
        return step;
      });
      const nextActive =
        body.status === 'completed'
          ? (nextSteps.find(
            (step) =>
              step &&
                typeof step === 'object' &&
                (step as { status?: string }).status !== 'completed'
          ) as { id?: string } | undefined)?.id ?? null
          : body.stepId;
      const now = new Date().toISOString();
      const nextPlanState = {
        ...(planState ?? {}),
        steps: nextSteps,
        activeStepId: nextActive,
        updatedAt: now,
      };
      const updated = await prisma.chatbotAgentRun.update({
        where: { id: runId },
        data: {
          planState: nextPlanState as Prisma.InputJsonValue,
          activeStepId: nextActive,
          checkpointedAt: new Date(),
          logLines: {
            push: `[${new Date().toISOString()}] Step overridden (${body.stepId} -> ${body.status}).`,
          },
        },
      });
      await logAgentAudit(updated.id, 'warning', 'Step overridden.', {
        stepId: body.stepId,
        status: body.status,
      });
      if (DEBUG_CHATBOT) {
        console.info('[chatbot][agent][POST] Step overridden', {
          runId,
          stepId: body.stepId,
          status: body.status,
          durationMs: Date.now() - requestStart,
        });
      }
      return NextResponse.json({ status: updated.status });
    }

    if (body.action === 'approve_step') {
      if (run.status === 'running') {
        return createErrorResponse(
          conflictError('Run is running. Stop it before approving steps.'),
          { request: req, source: 'chatbot.agent.[runId].POST' }
        );
      }
      if (!body.stepId?.trim()) {
        return createErrorResponse(
          badRequestError('stepId is required for approve_step.'),
          { request: req, source: 'chatbot.agent.[runId].POST' }
        );
      }
      const planState =
        run.planState && typeof run.planState === 'object'
          ? (run.planState as Record<string, unknown>)
          : null;
      const now = new Date().toISOString();
      const updated = await prisma.chatbotAgentRun.update({
        where: { id: runId },
        data: {
          status: 'queued',
          requiresHumanIntervention: false,
          errorMessage: null,
          finishedAt: null,
          checkpointedAt: new Date(),
          planState: {
            ...(planState ?? {}),
            approvalRequestedStepId: null,
            approvalGrantedStepId: body.stepId.trim(),
            activeStepId: body.stepId.trim(),
            updatedAt: now,
          },
          activeStepId: body.stepId.trim(),
          logLines: {
            push: `[${new Date().toISOString()}] Step approval granted (${body.stepId}).`,
          },
        },
      });
      await logAgentAudit(updated.id, 'warning', 'Step approval granted.', {
        stepId: body.stepId.trim(),
      });
      if (DEBUG_CHATBOT) {
        console.info('[chatbot][agent][POST] Step approved', {
          runId,
          stepId: body.stepId.trim(),
          durationMs: Date.now() - requestStart,
        });
      }
      return NextResponse.json({ status: updated.status });
    }

    if (['completed', 'failed', 'stopped'].includes(run.status)) {
      if (DEBUG_CHATBOT) {
        console.info('[chatbot][agent][POST] Already terminal', {
          runId,
          status: run.status,
          durationMs: Date.now() - requestStart,
        });
      }
      return NextResponse.json({ status: run.status });
    }

    const updated = await prisma.chatbotAgentRun.update({
      where: { id: runId },
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
      console.info('[chatbot][agent][POST] Stopped', {
        runId,
        status: updated.status,
        durationMs: Date.now() - requestStart,
      });
    }

    return NextResponse.json({ status: updated.status });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: 'chatbot.agent.[runId].POST',
      fallbackMessage: 'Failed to update agent run.',
    });
  }
}

async function DELETE_handler(req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
): Promise<Response> {
  const requestStart = Date.now();
  try {
    if (!('chatbotAgentRun' in prisma)) {
      return createErrorResponse(
        internalError(
          'Agent runs not initialized. Run prisma generate/db push.'
        ),
        { request: req, source: 'chatbot.agent.[runId].DELETE' }
      );
    }
    const { runId } = await params;
    const run = await prisma.chatbotAgentRun.findUnique({
      where: { id: runId },
    });
    if (!run) {
      return createErrorResponse(notFoundError('Run not found.'), {
        request: req,
        source: 'chatbot.agent.[runId].DELETE',
      });
    }
    const url = new URL(req.url);
    const force = url.searchParams.get('force') === 'true';
    if (run.status === 'running' && !force) {
      return createErrorResponse(
        conflictError('Run is running. Stop it before deleting.'),
        { request: req, source: 'chatbot.agent.[runId].DELETE' }
      );
    }
    if (run.status === 'running' && force) {
      await prisma.chatbotAgentRun.update({
        where: { id: runId },
        data: { status: 'stopped', finishedAt: new Date() },
      });
    }
    await prisma.chatbotAgentRun.delete({ where: { id: runId } });
    const runDir = path.join(process.cwd(), 'tmp', 'chatbot-agent', runId);
    await fs.rm(runDir, { recursive: true, force: true });
    await logAgentAudit(runId, 'warning', 'Agent run deleted.', {
      deletedAt: new Date().toISOString(),
    });
    if (DEBUG_CHATBOT) {
      console.info('[chatbot][agent][DELETE] Deleted', {
        runId,
        durationMs: Date.now() - requestStart,
      });
    }
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: 'chatbot.agent.[runId].DELETE',
      fallbackMessage: 'Failed to delete agent run.',
    });
  }
}

export const GET = apiHandlerWithParams<{ runId: string }>(
  async (req, _ctx, params) => GET_handler(req, { params: Promise.resolve(params) }),
  { source: 'chatbot.agent.[runId].GET' }
);
export const POST = apiHandlerWithParams<{ runId: string }>(
  async (req, _ctx, params) => POST_handler(req, { params: Promise.resolve(params) }),
  { source: 'chatbot.agent.[runId].POST' }
);
export const DELETE = apiHandlerWithParams<{ runId: string }>(
  async (req, _ctx, params) => DELETE_handler(req, { params: Promise.resolve(params) }),
  { source: 'chatbot.agent.[runId].DELETE' }
);
