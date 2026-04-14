import {
  AGENT_PERSONA_SETTINGS_KEY,
  DEFAULT_AGENT_PERSONA_SETTINGS,
} from '@/shared/contracts/agents';
import type { AgentPersona } from '@/shared/contracts/agents';
import type {
  NodeHandler,
  NodeHandlerContext,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths-runtime';
import type { ChatMessage } from '@/shared/contracts/chatbot';
import { agentApi, learnerAgentsApi, settingsApi } from '@/shared/lib/ai-paths/api';
import type { AgentEnqueuePayload } from '@/shared/lib/ai-paths/api';

import { coerceInput, formatRuntimeValue, hashRuntimeValue, parseJsonSafe } from '../../utils';
import { buildPromptOutput, coercePayloadObject } from '../utils';
import { logClientError } from '@/shared/utils/observability/client-error-logger';



type AgentRunRecord = {
  id?: string;
  status?: string;
  errorMessage?: string | null;
  logLines?: string[];
  planState?: unknown;
};

type AiTerminalStatus = 'blocked' | 'skipped';

type PersonaModelSettings = {
  executorModel?: string;
  plannerModel?: string;
  selfCheckModel?: string;
  extractionValidationModel?: string;
  toolRouterModel?: string;
  memoryValidationModel?: string;
  memorySummarizationModel?: string;
  loopGuardModel?: string;
  approvalGateModel?: string;
  selectorInferenceModel?: string;
  outputNormalizationModel?: string;
};

const AGENT_PROMPT_INPUT_KEYS = [
  'prompt',
  'value',
  'result',
  'bundle',
  'context',
  'entityJson',
  'title',
  'content_en',
] as const;

const toOptionalModelSetting = (
  settings: Record<string, unknown>,
  key: keyof PersonaModelSettings
): string | undefined => {
  const value = settings[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
};

const toPersonaModelSettings = (value: unknown): PersonaModelSettings => {
  const settingsRecord = coercePayloadObject(value) ?? {};
  return {
    executorModel: toOptionalModelSetting(settingsRecord, 'executorModel'),
    plannerModel: toOptionalModelSetting(settingsRecord, 'plannerModel'),
    selfCheckModel: toOptionalModelSetting(settingsRecord, 'selfCheckModel'),
    extractionValidationModel: toOptionalModelSetting(settingsRecord, 'extractionValidationModel'),
    toolRouterModel: toOptionalModelSetting(settingsRecord, 'toolRouterModel'),
    memoryValidationModel: toOptionalModelSetting(settingsRecord, 'memoryValidationModel'),
    memorySummarizationModel: toOptionalModelSetting(settingsRecord, 'memorySummarizationModel'),
    loopGuardModel: toOptionalModelSetting(settingsRecord, 'loopGuardModel'),
    approvalGateModel: toOptionalModelSetting(settingsRecord, 'approvalGateModel'),
    selectorInferenceModel: toOptionalModelSetting(settingsRecord, 'selectorInferenceModel'),
    outputNormalizationModel: toOptionalModelSetting(settingsRecord, 'outputNormalizationModel'),
  };
};

const toLearnerChatResult = (value: unknown): { message: string; sources: unknown[] } => {
  const data = coercePayloadObject(value) ?? {};
  const message = typeof data['message'] === 'string' ? data['message'] : '';
  const sources = Array.isArray(data['sources']) ? data['sources'] : [];
  return { message, sources };
};

const buildAiTerminalOutputs = (options: {
  status: AiTerminalStatus;
  reason: string;
  details?: RuntimePortValues;
}): RuntimePortValues => {
  const base: RuntimePortValues = {
    status: options.status,
    skipReason: options.reason,
    result: '',
  };
  if (options.status === 'blocked') {
    base['blockedReason'] = options.reason;
  }
  return {
    ...base,
    ...(options.details ?? {}),
  };
};

const parseAgentPersonas = (value: unknown): AgentPersona[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value as AgentPersona[];
  }
  if (typeof value === 'string') {
    const parsed = parseJsonSafe(value);
    return Array.isArray(parsed) ? (parsed as AgentPersona[]) : [];
  }
  return [];
};

const fetchAgentPersonas = async (): Promise<AgentPersona[]> => {
  const response = await settingsApi.list('heavy' as const);
  if (!response.ok) return [];
  const record = response.data.find(
    (item: { key: string }) => item.key === AGENT_PERSONA_SETTINGS_KEY
  );
  if (!record) return [];
  return parseAgentPersonas(record.value);
};

const AGENT_TERMINAL_POLL_STATUSES = new Set(['completed', 'waiting_human']);
const AGENT_FAILED_POLL_STATUSES = new Set(['failed', 'stopped']);

const assertAgentPollResponse = (
  response: Awaited<ReturnType<typeof agentApi.poll>>
): AgentRunRecord => {
  if (!response.ok) {
    throw new Error(response.error || 'Failed to poll agent run.');
  }

  return (response.data.run as AgentRunRecord | undefined) ?? {};
};

const sleepForAgentPoll = async (intervalMs: number): Promise<void> => {
  await new Promise<void>((resolve: (value: void | PromiseLike<void>) => void) =>
    setTimeout(resolve, intervalMs)
  );
};

const shouldPollAgentAgain = (attempt: number, maxAttempts: number): boolean =>
  attempt < maxAttempts - 1;

export const pollAgentRun = async (
  runId: string,
  options?: { intervalMs?: number; maxAttempts?: number }
): Promise<{ run?: AgentRunRecord; status?: string }> => {
  const maxAttempts = options?.maxAttempts ?? 60;
  const intervalMs = options?.intervalMs ?? 2000;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const run = assertAgentPollResponse(await agentApi.poll(runId));
    const status = run?.status ?? '';

    if (AGENT_TERMINAL_POLL_STATUSES.has(status)) {
      return { run, status };
    }

    if (AGENT_FAILED_POLL_STATUSES.has(status)) {
      throw new Error(run?.errorMessage || 'Agent run failed.');
    }

    if (shouldPollAgentAgain(attempt, maxAttempts)) {
      await sleepForAgentPoll(intervalMs);
    }
  }

  throw new Error('Agent run timed out.');
};

const resolveAgentPromptValue = (nodeInputs: RuntimePortValues): unknown => {
  for (const key of AGENT_PROMPT_INPUT_KEYS) {
    const value = coerceInput(nodeInputs[key]);

    if (value !== undefined && value !== null) {
      return value;
    }
  }

  return undefined;
};

const resolveAgentPrompt = (args: {
  promptTemplate?: string | null;
  nodeInputs: RuntimePortValues;
}): string => {
  const template = args.promptTemplate?.trim();
  const rawPrompt = template?.length
    ? buildPromptOutput({ template }, args.nodeInputs).promptOutput
    : resolveAgentPromptValue(args.nodeInputs);

  return typeof rawPrompt === 'string' ? rawPrompt.trim() : formatRuntimeValue(rawPrompt);
};

const buildLearnerAgentMessages = (args: {
  prompt: string;
  runId: string;
}): ChatMessage[] => [
  {
    id: `msg_${args.runId}_${Date.now()}`,
    sessionId: args.runId,
    role: 'user',
    content: args.prompt,
    timestamp: new Date().toISOString(),
  },
];

export const handleAgent: NodeHandler = async ({
  node,
  nodeInputs,
  prevOutputs,
  contextRegistry,
  skipAiJobs,
  executed,
  toast,
  reportAiPathsError,
}: NodeHandlerContext): Promise<RuntimePortValues> => {
  if (skipAiJobs) {
    return buildAiTerminalOutputs({
      status: 'skipped',
      reason: 'ai_jobs_disabled',
      details: {
        bundle: {
          status: 'skipped',
        },
      },
    });
  }
  if (executed.ai.has(node.id)) return prevOutputs;

  const agentConfig = node.config?.agent ?? {
    personaId: '',
    promptTemplate: '',
    waitForResult: true,
  };

  const prompt = resolveAgentPrompt({
    promptTemplate: agentConfig.promptTemplate,
    nodeInputs,
  });

  if (!prompt || prompt === '—') {
    return buildAiTerminalOutputs({
      status: 'blocked',
      reason: 'missing_prompt',
      details: {
        bundle: {
          status: 'blocked',
        },
      },
    });
  }

  let personas: AgentPersona[];
  try {
    personas = await fetchAgentPersonas();
  } catch (error) {
    logClientError(error);
    personas = [];
  }
  const persona = agentConfig.personaId
    ? personas.find((item: { id: string }) => item.id === agentConfig.personaId)
    : undefined;
  const settings = toPersonaModelSettings(persona?.settings ?? DEFAULT_AGENT_PERSONA_SETTINGS);

  const payload: AgentEnqueuePayload = {
    prompt,
    ...(settings.executorModel ? { model: settings.executorModel } : {}),
    ...(settings.plannerModel ? { plannerModel: settings.plannerModel } : {}),
    ...(settings.selfCheckModel ? { selfCheckModel: settings.selfCheckModel } : {}),
    ...(settings.extractionValidationModel
      ? { extractionValidationModel: settings.extractionValidationModel }
      : {}),
    ...(settings.toolRouterModel ? { toolRouterModel: settings.toolRouterModel } : {}),
    ...(settings.memoryValidationModel
      ? { memoryValidationModel: settings.memoryValidationModel }
      : {}),
    ...(settings.memorySummarizationModel
      ? { memorySummarizationModel: settings.memorySummarizationModel }
      : {}),
    ...(settings.loopGuardModel ? { loopGuardModel: settings.loopGuardModel } : {}),
    ...(settings.approvalGateModel ? { approvalGateModel: settings.approvalGateModel } : {}),
    ...(settings.selectorInferenceModel
      ? { selectorInferenceModel: settings.selectorInferenceModel }
      : {}),
    ...(settings.outputNormalizationModel
      ? { outputNormalizationModel: settings.outputNormalizationModel }
      : {}),
    ...(contextRegistry ? { contextRegistry } : {}),
  };

  let runId: string | undefined;
  try {
    const enqueueResult = await agentApi.enqueue(payload);
    if (!enqueueResult.ok) {
      throw new Error(enqueueResult.error || 'Failed to enqueue agent run.');
    }
    const runIdRaw = enqueueResult.data.runId;
    if (typeof runIdRaw !== 'string' || runIdRaw.trim().length === 0) {
      throw new Error('Agent run enqueue response did not include a valid run id.');
    }
    runId = runIdRaw;
    executed.ai.add(node.id);
    toast('Agent run queued.', { variant: 'success' });

    if (agentConfig.waitForResult === false) {
      return {
        jobId: runId,
        status: 'queued',
        bundle: {
          runId,
          status: 'queued',
          personaId: persona?.id ?? null,
          personaName: persona?.name ?? null,
          model: settings.executorModel ?? null,
        },
      };
    }

    const { run, status } = await pollAgentRun(runId);
    const planState =
      run?.planState && typeof run.planState === 'object'
        ? (run.planState as Record<string, unknown>)
        : (coercePayloadObject(run?.planState) ?? null);
    const checkpointBrief =
      typeof planState?.['checkpointBrief'] === 'string' ? planState['checkpointBrief'] : '';
    const logLines = Array.isArray(run?.logLines) ? run?.logLines : [];
    const lastLog = logLines.length > 0 ? (logLines[logLines.length - 1] ?? '') : '';
    const result = checkpointBrief || lastLog || run?.errorMessage || '';

    return {
      result,
      jobId: runId,
      status: status ?? run?.status ?? 'completed',
      bundle: {
        runId,
        status: status ?? run?.status ?? 'completed',
        personaId: persona?.id ?? null,
        personaName: persona?.name ?? null,
        model: settings.executorModel ?? null,
        run,
      },
    };
  } catch (error) {
    logClientError(error);
    reportAiPathsError(error, { action: 'agentRun', nodeId: node.id }, 'Agent run failed:');
    const errorMessage = error instanceof Error ? error.message : 'Agent run failed';
    toast(errorMessage, { variant: 'error' });
    executed.ai.add(node.id);
    return {
      result: '',
      jobId: runId,
      status: 'failed',
      bundle: {
        runId,
        status: 'failed',
        personaId: persona?.id ?? null,
        personaName: persona?.name ?? null,
        model: settings.executorModel ?? null,
      },
    };
  }
};

export const handleLearnerAgent: NodeHandler = async ({
  node,
  nodeInputs,
  prevOutputs,
  skipAiJobs,
  executed,
  toast,
  reportAiPathsError,
  runId,
  runStartedAt,
}: NodeHandlerContext): Promise<RuntimePortValues> => {
  if (node.type !== 'learner_agent') return prevOutputs;
  if (skipAiJobs) {
    return buildAiTerminalOutputs({
      status: 'skipped',
      reason: 'ai_jobs_disabled',
      details: {
        sources: [],
        bundle: {
          status: 'skipped',
        },
      },
    });
  }

  const learnerConfig = node.config?.learnerAgent ?? {
    agentId: '',
    promptTemplate: '',
    includeSources: true,
  };

  const agentId = learnerConfig.agentId?.trim();
  if (!agentId) {
    return buildAiTerminalOutputs({
      status: 'blocked',
      reason: 'missing_agent_id',
      details: {
        sources: [],
        bundle: {
          status: 'blocked',
        },
      },
    });
  }

  const prompt = resolveAgentPrompt({
    promptTemplate: learnerConfig.promptTemplate,
    nodeInputs,
  });

  if (!prompt || prompt === '—') {
    return buildAiTerminalOutputs({
      status: 'blocked',
      reason: 'missing_prompt',
      details: {
        sources: [],
        bundle: {
          agentId,
          status: 'blocked',
        },
      },
    });
  }

  const messages = buildLearnerAgentMessages({ prompt, runId });
  const payload = { agentId, messages };
  const payloadHash = hashRuntimeValue({ payload, runId, runStartedAt });
  const prevPayloadHash =
    typeof prevOutputs['payloadHash'] === 'string' ? prevOutputs['payloadHash'] : '';
  if (prevPayloadHash && prevPayloadHash === payloadHash) {
    return prevOutputs;
  }

  if (executed.ai.has(node.id)) return prevOutputs;

  try {
    const response = await learnerAgentsApi.chat(payload);
    if (!response.ok) {
      throw new Error(response.error || 'Learner agent chat failed.');
    }
    const chatResult = toLearnerChatResult(response.data);
    executed.ai.add(node.id);

    const includeSources = learnerConfig.includeSources !== false;
    return {
      result: chatResult.message,
      sources: includeSources ? chatResult.sources : [],
      status: 'completed',
      bundle: {
        agentId,
        message: chatResult.message,
        sources: includeSources ? chatResult.sources : [],
      },
      payloadHash,
    };
  } catch (error) {
    logClientError(error);
    reportAiPathsError(
      error,
      { action: 'learnerAgent', nodeId: node.id, agentId },
      'Learner agent node failed:'
    );
    toast('Learner agent failed.', { variant: 'error' });
    executed.ai.add(node.id);
    return {
      result: '',
      sources: [],
      status: 'failed',
      bundle: {
        agentId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Learner agent failed',
      },
      payloadHash,
    };
  }
};
