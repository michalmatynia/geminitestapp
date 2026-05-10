import { type NextRequest } from 'next/server';
import { z } from 'zod';

import type {
  AgentRuntimeRunRecord,
  getChatbotAgentRunDelegate,
} from '@/features/ai/agent-runtime/store-delegates';
import { badRequestError } from '@/shared/errors/app-error';
import type { InputJsonValue } from '@/shared/contracts/json';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

const AGENT_RUN_ACTIONS = ['stop', 'resume', 'retry_step', 'override_step', 'approve_step'] as const;
const OVERRIDE_STEP_STATUSES = ['completed', 'failed', 'pending'] as const;
const TERMINAL_STATUSES = ['completed', 'failed', 'stopped'] as const;

const agentRunActionRequestSchema = z.object({
  action: z.enum(AGENT_RUN_ACTIONS),
  stepId: z.string().optional(),
  status: z.enum(OVERRIDE_STEP_STATUSES).optional(),
  prompt: z.string().optional(),
});

export type AgentRunActionRequest = z.infer<typeof agentRunActionRequestSchema>;
export type ChatbotAgentRunDelegate = NonNullable<ReturnType<typeof getChatbotAgentRunDelegate>>;

export type AgentRunRouteRecord = Pick<
  AgentRuntimeRunRecord,
  'id' | 'prompt' | 'status' | 'planState'
> & {
  checkpointedAt?: Date | string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  logLines?: string[];
};

export type AgentRunActionHandlerArgs = {
  runId: string;
  body: AgentRunActionRequest;
  run: AgentRunRouteRecord;
  storage: ChatbotAgentRunDelegate;
  requestStart: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const readActionForError = (payload: unknown): string => {
  if (!isRecord(payload)) {
    return '';
  }
  const action = payload['action'];
  return typeof action === 'string' ? action : '';
};

export const isTerminalStatus = (status: string): boolean =>
  TERMINAL_STATUSES.includes(status as (typeof TERMINAL_STATUSES)[number]);

export const getTrimmedOptionalString = (value: string | undefined): string | null => {
  if (value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const requireTrimmedField = (value: string | undefined, message: string): string => {
  const trimmed = getTrimmedOptionalString(value);
  if (trimmed === null) {
    throw badRequestError(message);
  }
  return trimmed;
};

export const toPlanStateRecord = (planState: unknown): Record<string, unknown> => {
  if (!isRecord(planState)) {
    return {};
  }
  return planState;
};

export const toInputJsonValue = (value: Record<string, unknown>): InputJsonValue =>
  value as InputJsonValue;

export const requirePlanSteps = (
  planState: Record<string, unknown>,
  runId: string,
  action: string
): unknown[] => {
  const steps = planState['steps'];
  if (!Array.isArray(steps)) {
    throw badRequestError(`No plan steps available to ${action} for run "${runId}".`);
  }
  return steps;
};

const isStepRecordWithId = (step: unknown, stepId: string): step is Record<string, unknown> =>
  isRecord(step) && step['id'] === stepId;

const isIncompleteStepRecord = (step: unknown): step is Record<string, unknown> =>
  isRecord(step) && step['status'] !== 'completed';

export const resetRetryStep = (step: unknown, stepId: string): unknown => {
  if (!isStepRecordWithId(step, stepId)) {
    return step;
  }
  const maxAttempts = typeof step['maxAttempts'] === 'number' ? step['maxAttempts'] : 1;
  return {
    ...step,
    status: 'pending',
    attempts: 0,
    maxAttempts: maxAttempts + 1,
  };
};

export const overrideStepStatus = (step: unknown, stepId: string, status: string): unknown => {
  if (!isStepRecordWithId(step, stepId)) {
    return step;
  }
  return { ...step, status };
};

const readStepId = (step: Record<string, unknown>): string | null => {
  const id = step['id'];
  return typeof id === 'string' ? id : null;
};

export const findNextActiveStepId = (
  steps: unknown[],
  status: string,
  fallbackStepId: string
): string | null => {
  if (status !== 'completed') {
    return fallbackStepId;
  }
  const nextStep = steps.find(isIncompleteStepRecord);
  return nextStep === undefined ? null : readStepId(nextStep);
};

export const buildResumePlanState = (
  planState: Record<string, unknown>,
  now: string,
  nextPrompt: string | null,
  resumeStepId: string | null
): InputJsonValue => {
  const nextPlanState: Record<string, unknown> = {
    ...planState,
    resumeRequestedAt: now,
  };
  if (nextPrompt !== null) {
    nextPlanState['promptUpdatedAt'] = now;
  }
  if (resumeStepId !== null) {
    nextPlanState['activeStepId'] = resumeStepId;
  }
  return toInputJsonValue(nextPlanState);
};

export const parseAgentRunActionRequest = async (
  req: NextRequest,
  runId: string
): Promise<AgentRunActionRequest> => {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch (error) {
    logClientError(error);
    throw badRequestError('Invalid JSON payload. The request body must be a valid JSON object.', {
      runId,
      cause: error,
    });
  }

  const parsed = agentRunActionRequestSchema.safeParse(payload);
  if (!parsed.success) {
    const action = readActionForError(payload);
    throw badRequestError(
      `Unsupported action "${action}". Allowed actions are: stop, resume, retry_step, override_step, approve_step.`,
      { runId, action, errors: parsed.error.format() }
    );
  }
  return parsed.data;
};
