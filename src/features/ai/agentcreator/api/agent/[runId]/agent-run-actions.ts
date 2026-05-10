import { NextResponse } from 'next/server';

import { logAgentAudit } from '@/features/ai/agent-runtime/audit';
import { badRequestError, conflictError } from '@/shared/errors/app-error';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import {
  type AgentRunActionHandlerArgs,
  type AgentRunRouteRecord,
  buildResumePlanState,
  findNextActiveStepId,
  getTrimmedOptionalString,
  isTerminalStatus,
  overrideStepStatus,
  requirePlanSteps,
  requireTrimmedField,
  resetRetryStep,
  toInputJsonValue,
  toPlanStateRecord,
} from './agent-run-action-shared';

export { type AgentRunRouteRecord, parseAgentRunActionRequest } from './agent-run-action-shared';

const DEBUG_CHATBOT = process.env['DEBUG_CHATBOT'] === 'true';

const handleResumeAction = async (args: AgentRunActionHandlerArgs): Promise<Response> => {
  if (args.run.status === 'running') {
    return NextResponse.json({ status: args.run.status });
  }

  const now = new Date().toISOString();
  const nextPrompt = getTrimmedOptionalString(args.body.prompt);
  const resumeStepId = getTrimmedOptionalString(args.body.stepId);
  const planState = toPlanStateRecord(args.run.planState);
  const updated = await args.storage.update<Pick<AgentRunRouteRecord, 'id' | 'status'>>({
    where: { id: args.runId },
    data: {
      status: 'queued',
      requiresHumanIntervention: false,
      errorMessage: null,
      finishedAt: null,
      checkpointedAt: new Date(),
      planState: buildResumePlanState(planState, now, nextPrompt, resumeStepId),
      ...(resumeStepId !== null ? { activeStepId: resumeStepId } : {}),
      ...(nextPrompt !== null ? { prompt: nextPrompt } : {}),
      logLines: { push: `[${now}] Run resume requested.` },
    },
  });

  if (nextPrompt !== null && nextPrompt !== args.run.prompt) {
    await logAgentAudit(updated.id, 'warning', 'Agent prompt updated.', {
      promptLength: nextPrompt.length,
    });
  }
  await logAgentAudit(updated.id, 'info', 'Agent run resume requested.');

  if (DEBUG_CHATBOT) {
    void ErrorSystem.logInfo('Resumed', {
      service: 'agent-api',
      runId: args.runId,
      status: updated.status,
      durationMs: Date.now() - args.requestStart,
    });
  }
  return NextResponse.json({ status: updated.status });
};

const handleRetryStepAction = async (args: AgentRunActionHandlerArgs): Promise<Response> => {
  if (args.run.status === 'running') {
    throw conflictError('Run is running. Stop it before retrying steps.');
  }
  const stepId = requireTrimmedField(
    args.body.stepId,
    'stepId is required for retry_step. Provide the id of the step to retry.'
  );
  const planState = toPlanStateRecord(args.run.planState);
  const nextSteps = requirePlanSteps(planState, args.runId, 'retry').map((step) =>
    resetRetryStep(step, stepId)
  );
  const now = new Date().toISOString();

  await args.storage.update({
    where: { id: args.runId },
    data: {
      status: 'queued',
      requiresHumanIntervention: false,
      errorMessage: null,
      finishedAt: null,
      checkpointedAt: new Date(),
      planState: toInputJsonValue({
        ...planState,
        steps: nextSteps,
        activeStepId: stepId,
        resumeRequestedAt: now,
        updatedAt: now,
      }),
      activeStepId: stepId,
      logLines: { push: `[${now}] Step retry requested (${stepId}).` },
    },
  });
  return NextResponse.json({ status: 'queued' });
};

const handleOverrideStepAction = async (args: AgentRunActionHandlerArgs): Promise<Response> => {
  if (args.run.status === 'running') {
    throw conflictError('Run is running. Stop it before overriding steps.');
  }
  const stepId = requireTrimmedField(args.body.stepId, 'stepId is required for override_step.');
  const status = requireTrimmedField(args.body.status, 'status is required for override_step.');
  const planState = toPlanStateRecord(args.run.planState);
  const nextSteps = requirePlanSteps(planState, args.runId, 'override').map((step) =>
    overrideStepStatus(step, stepId, status)
  );
  const nextActive = findNextActiveStepId(nextSteps, status, stepId);
  const now = new Date().toISOString();
  const updated = await args.storage.update<Pick<AgentRunRouteRecord, 'id' | 'status'>>({
    where: { id: args.runId },
    data: {
      planState: toInputJsonValue({
        ...planState,
        steps: nextSteps,
        activeStepId: nextActive,
        updatedAt: now,
      }),
      activeStepId: nextActive,
      checkpointedAt: new Date(),
      logLines: { push: `[${now}] Step overridden (${stepId} -> ${status}).` },
    },
  });

  await logAgentAudit(updated.id, 'warning', 'Step overridden.', { stepId, status });
  if (DEBUG_CHATBOT) {
    void ErrorSystem.logInfo('Step overridden', {
      service: 'agent-api',
      runId: args.runId,
      stepId,
      status,
    });
  }
  return NextResponse.json({ status: updated.status });
};

const handleApproveStepAction = async (args: AgentRunActionHandlerArgs): Promise<Response> => {
  if (args.run.status === 'running') {
    throw conflictError('Run is running. Stop it before approving steps.');
  }
  const stepId = requireTrimmedField(args.body.stepId, 'stepId is required for approve_step.');
  const planState = toPlanStateRecord(args.run.planState);
  const now = new Date().toISOString();
  const updated = await args.storage.update<Pick<AgentRunRouteRecord, 'id' | 'status'>>({
    where: { id: args.runId },
    data: {
      status: 'queued',
      requiresHumanIntervention: false,
      errorMessage: null,
      finishedAt: null,
      checkpointedAt: new Date(),
      planState: toInputJsonValue({
        ...planState,
        approvalRequestedStepId: null,
        approvalGrantedStepId: stepId,
        activeStepId: stepId,
        updatedAt: now,
      }),
      activeStepId: stepId,
      logLines: { push: `[${now}] Step approval granted (${stepId}).` },
    },
  });

  await logAgentAudit(updated.id, 'warning', 'Step approval granted.', { stepId });
  if (DEBUG_CHATBOT) {
    void ErrorSystem.logInfo('Step approved', {
      service: 'agent-api',
      runId: args.runId,
      stepId,
    });
  }
  return NextResponse.json({ status: updated.status });
};

const handleStopAction = async (args: AgentRunActionHandlerArgs): Promise<Response> => {
  if (isTerminalStatus(args.run.status)) {
    if (DEBUG_CHATBOT) {
      void ErrorSystem.logInfo('Already terminal', {
        service: 'agent-api',
        runId: args.runId,
        status: args.run.status,
        durationMs: Date.now() - args.requestStart,
      });
    }
    return NextResponse.json({ status: args.run.status });
  }

  const now = new Date().toISOString();
  const updated = await args.storage.update<Pick<AgentRunRouteRecord, 'id' | 'status'>>({
    where: { id: args.runId },
    data: {
      status: 'stopped',
      finishedAt: new Date(),
      logLines: { push: `[${now}] Run stopped by user.` },
    },
  });

  await logAgentAudit(updated.id, 'warning', 'Agent run stopped by user.');
  if (DEBUG_CHATBOT) {
    void ErrorSystem.logInfo('Stopped', {
      service: 'agent-api',
      runId: args.runId,
      status: updated.status,
      durationMs: Date.now() - args.requestStart,
    });
  }
  return NextResponse.json({ status: updated.status });
};

export const handleAgentRunAction = (args: AgentRunActionHandlerArgs): Promise<Response> => {
  switch (args.body.action) {
    case 'resume':
      return handleResumeAction(args);
    case 'retry_step':
      return handleRetryStepAction(args);
    case 'override_step':
      return handleOverrideStepAction(args);
    case 'approve_step':
      return handleApproveStepAction(args);
    case 'stop':
      return handleStopAction(args);
    default:
      throw badRequestError(`Unsupported action "${args.body.action}".`);
  }
};
