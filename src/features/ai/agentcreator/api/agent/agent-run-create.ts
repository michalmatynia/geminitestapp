import { type NextRequest } from 'next/server';
import { z } from 'zod';

import { logAgentAudit } from '@/features/ai/agent-runtime/audit';
import { resolveAgentRuntimeContextRegistryEnvelope } from '@/features/ai/agent-runtime/context-registry/server';
import type {
  AgentRuntimeRunRecord,
  getChatbotAgentRunDelegate,
} from '@/features/ai/agent-runtime/store-delegates';
import { startAgentQueue } from '@/features/ai/agent-runtime/workers/agentQueue';
import type { AgentPlanSettings, AgentRunEnqueueResponse } from '@/shared/contracts/agent-runtime';
import { contextRegistryConsumerEnvelopeSchema } from '@/shared/contracts/ai-context-registry';
import type { InputJsonValue } from '@/shared/contracts/json';
import { badRequestError } from '@/shared/errors/app-error';

type AgentRunCreateRecord = Pick<
  AgentRuntimeRunRecord,
  'id' | 'model' | 'searchProvider' | 'agentBrowser' | 'status'
> & {
  tools: string[];
};

type ChatbotAgentRunDelegate = NonNullable<ReturnType<typeof getChatbotAgentRunDelegate>>;

const agentCreateRequestSchema = z.object({
  prompt: z.string(),
  model: z.string().optional().nullable(),
  personaId: z.string().optional().nullable(),
  tools: z.array(z.string()).optional(),
  searchProvider: z.string().optional().nullable(),
  agentBrowser: z.string().optional().nullable(),
  runHeadless: z.boolean().optional(),
  ignoreRobotsTxt: z.boolean().optional(),
  requireHumanApproval: z.boolean().optional(),
  planSettings: z.record(z.string(), z.unknown()).optional(),
  contextRegistry: contextRegistryConsumerEnvelopeSchema.optional(),
});

type AgentCreateRequest = z.infer<typeof agentCreateRequestSchema>;
type ResolvedContextRegistry = Awaited<
  ReturnType<typeof resolveAgentRuntimeContextRegistryEnvelope>
>;

const normalizeOptionalTrimmedString = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toNumericValue = (value: unknown): number => {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    return Number(value);
  }
  return NaN;
};

const clampInt = (value: unknown, min: number, max: number, fallback: number): number => {
  const numeric = toNumericValue(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.min(Math.max(Math.round(numeric), min), max);
};

const normalizePlanSettings = (input: Record<string, unknown> | undefined): AgentPlanSettings | null => {
  if (input === undefined) {
    return null;
  }
  return {
    maxSteps: clampInt(input['maxSteps'], 1, 20, 12),
    maxStepAttempts: clampInt(input['maxStepAttempts'], 1, 5, 2),
    maxReplanCalls: clampInt(input['maxReplanCalls'], 0, 6, 2),
    replanEverySteps: clampInt(input['replanEverySteps'], 1, 10, 2),
    maxSelfChecks: clampInt(input['maxSelfChecks'], 0, 8, 4),
    loopGuardThreshold: clampInt(input['loopGuardThreshold'], 1, 5, 2),
    loopBackoffBaseMs: clampInt(input['loopBackoffBaseMs'], 250, 20000, 2000),
    loopBackoffMaxMs: clampInt(input['loopBackoffMaxMs'], 1000, 60000, 12000),
  };
};

const parseAgentCreateRequest = async (req: NextRequest): Promise<AgentCreateRequest> => {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    throw badRequestError(
      'Invalid JSON payload. The request body must be a valid JSON object with a "prompt" field.'
    );
  }

  const parsed = agentCreateRequestSchema.safeParse(payload);
  if (!parsed.success) {
    throw badRequestError('Invalid agent run payload.', { errors: parsed.error.format() });
  }

  const prompt = parsed.data.prompt.trim();
  if (prompt.length === 0) {
    throw badRequestError(
      'Prompt is required. Provide a non-empty prompt string in the request body.'
    );
  }

  return { ...parsed.data, prompt };
};

const resolveCreateContextRegistry = async (
  body: AgentCreateRequest
): Promise<ResolvedContextRegistry | null> => {
  if (body.contextRegistry === undefined) {
    return null;
  }
  return resolveAgentRuntimeContextRegistryEnvelope(body.contextRegistry);
};

const hasPlanPreferenceOverrides = (body: AgentCreateRequest): boolean =>
  body.ignoreRobotsTxt !== undefined || body.requireHumanApproval !== undefined;

const shouldCreatePlanState = (
  planSettings: AgentPlanSettings | null,
  hasPreferenceOverrides: boolean,
  contextRegistry: ResolvedContextRegistry | null
): boolean =>
  planSettings !== null || hasPreferenceOverrides || contextRegistry !== null;

const buildCreatePlanState = async (body: AgentCreateRequest): Promise<InputJsonValue | null> => {
  const planSettings = normalizePlanSettings(body.planSettings);
  const contextRegistry = await resolveCreateContextRegistry(body);
  const hasPreferenceOverrides = hasPlanPreferenceOverrides(body);

  if (!shouldCreatePlanState(planSettings, hasPreferenceOverrides, contextRegistry)) {
    return null;
  }

  const planState: Record<string, unknown> = {};
  if (planSettings !== null) {
    planState['settings'] = planSettings;
  }
  if (hasPreferenceOverrides) {
    planState['preferences'] = {
      ignoreRobotsTxt: body.ignoreRobotsTxt === true,
      requireHumanApproval: body.requireHumanApproval === true,
    };
  }
  if (contextRegistry !== null) {
    planState['contextRegistry'] = contextRegistry;
  }
  return planState as InputJsonValue;
};

export const createAgentRun = async (
  req: NextRequest,
  chatbotAgentRun: ChatbotAgentRunDelegate
): Promise<AgentRunEnqueueResponse> => {
  const body = await parseAgentCreateRequest(req);
  const planState = await buildCreatePlanState(body);
  const run = await chatbotAgentRun.create<AgentRunCreateRecord>({
    data: {
      prompt: body.prompt,
      model: normalizeOptionalTrimmedString(body.model),
      personaId: normalizeOptionalTrimmedString(body.personaId),
      tools: body.tools ?? [],
      searchProvider: normalizeOptionalTrimmedString(body.searchProvider),
      agentBrowser: normalizeOptionalTrimmedString(body.agentBrowser),
      runHeadless: body.runHeadless ?? true,
      logLines: [`[${new Date().toISOString()}] Run queued.`],
      ...(planState !== null ? { planState } : {}),
    },
  });

  await logAgentAudit(run.id, 'info', 'Agent run queued.', {
    model: run.model,
    tools: run.tools,
    searchProvider: run.searchProvider,
    agentBrowser: run.agentBrowser,
  });

  startAgentQueue();
  return { runId: run.id, status: run.status };
};
