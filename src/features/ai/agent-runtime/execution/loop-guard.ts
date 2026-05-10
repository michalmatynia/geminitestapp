import {
  buildBranchStepsFromAlternatives,
  buildPlanStepsFromSpecs,
  flattenPlanHierarchy,
  normalizePlanHierarchy,
  normalizePlannerMeta,
  normalizeStringList,
  parsePlanJson,
} from '@/features/ai/agent-runtime/planning/utils';
import { getAgentAuditLogDelegate } from '@/features/ai/agent-runtime/store-delegates';
import type { LoopSignal, PlanStep, PlannerMeta } from '@/shared/contracts/agent-runtime';
import { runBrainChatCompletion } from '@/shared/lib/ai-brain/server-runtime-client';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { detectLoopPattern } from './loop-guard-patterns';

export { detectLoopPattern };

type PlanStepSpecInput = {
  title?: string;
  tool?: string;
  expectedObservation?: string | null;
  successCriteria?: string | null;
  phase?: string | null;
  priority?: number | null;
  dependsOn?: number[] | string[] | null;
  goalId?: string | null;
  subgoalId?: string | null;
};

const normalizePlanStepSpecs = (steps: PlanStepSpecInput[]): PlanStepSpecInput[] =>
  steps.map((step: PlanStepSpecInput) => {
    const { expectedObservation, successCriteria, phase, priority, dependsOn, ...rest } = step;
    return {
      ...rest,
      ...(expectedObservation !== null && { expectedObservation }),
      ...(successCriteria !== null && { successCriteria }),
      ...(phase !== null && { phase }),
      ...(priority !== null && { priority }),
      ...(dependsOn !== null && { dependsOn }),
    };
  });

const runLoopGuardTask = async (input: {
  model: string;
  systemPrompt: string;
  userContent: string;
  temperature?: number;
}): Promise<string> => {
  const response = await runBrainChatCompletion({
    modelId: input.model,
    temperature: input.temperature ?? 0.2,
    jsonMode: true,
    messages: [
      {
        role: 'system',
        content: input.systemPrompt,
      },
      {
        role: 'user',
        content: input.userContent,
      },
    ],
  });
  return response.text.trim();
};

interface ParsedLoopGuardResponse {
  action?: string;
  reason?: string;
  questions?: string[];
  evidence?: string[];
  steps?: Array<{
    title?: string;
    tool?: string;
    expectedObservation?: string;
    successCriteria?: string;
    phase?: string;
    priority?: number;
    dependsOn?: number[] | string[];
  }>;
  goals?: Array<{
    title?: string;
    successCriteria?: string;
    subgoals?: Array<{
      title?: string;
      successCriteria?: string;
      steps?: Array<{
        title?: string;
        tool?: string;
        expectedObservation?: string;
        successCriteria?: string;
        phase?: string;
        priority?: number;
        dependsOn?: number[] | string[];
      }>;
    }>;
  }>;
  taskType?: string;
}

const resolveLoopGuardSteps = (args: {
  parsed: ParsedLoopGuardResponse;
  action: 'continue' | 'replan' | 'wait_human';
  meta: PlannerMeta;
  maxSteps: number;
  maxStepAttempts: number;
}): PlanStep[] => {
  const { parsed, action, meta, maxSteps, maxStepAttempts } = args;
  if (action !== 'replan') return [];

  const hierarchy = normalizePlanHierarchy(parsed);
  const hierarchySteps = hierarchy ? flattenPlanHierarchy(hierarchy) : [];
  const stepSpecs = hierarchySteps.length > 0 ? hierarchySteps : (parsed.steps ?? []);

  const steps = buildPlanStepsFromSpecs(
    normalizePlanStepSpecs(stepSpecs),
    meta,
    true,
    maxStepAttempts
  ).slice(0, maxSteps);

  if (steps.length === 0) {
    const fallbackBranch = buildBranchStepsFromAlternatives(
      meta.alternatives ?? undefined,
      maxStepAttempts,
      maxSteps
    );
    if (fallbackBranch.length > 0) return fallbackBranch;
  }

  return steps;
};

const recordLoopGuardAudit = async (
  runId: string | undefined,
  action: string,
  reason: string | null,
  loopSignal: LoopSignal
): Promise<void> => {
  const agentAuditLog = getAgentAuditLogDelegate();
  if (agentAuditLog && runId !== undefined) {
    await agentAuditLog.create({
      data: {
        runId,
        level: 'info',
        message: 'Loop guard completed.',
        metadata: {
          action,
          reason,
          loop: loopSignal,
        },
      },
    });
  }
};

const buildLoopGuardUserContent = (args: {
  prompt: string;
  memory: string[];
  browserContext?: {
    url: string;
    title: string | null;
    domTextSample: string;
    logs: { level: string; message: string }[];
    uiInventory?: unknown;
  } | null;
  lastError?: string | null;
  loopSignal: LoopSignal;
  completedIndex: number;
  currentPlan: PlanStep[];
  maxSteps: number;
}): string => {
  return JSON.stringify({
    prompt: args.prompt,
    memory: args.memory,
    browserContext: args.browserContext,
    lastError: args.lastError,
    loopSignal: args.loopSignal,
    completedStepIndex: args.completedIndex,
    currentPlan: args.currentPlan.map((step: PlanStep) => ({
      title: step.title,
      status: step.status,
      tool: step.tool,
      expectedObservation: step.expectedObservation,
      successCriteria: step.successCriteria,
    })),
    maxSteps: args.maxSteps,
  });
};

const performLoopGuardReview = async (args: {
  model: string;
  prompt: string;
  memory: string[];
  browserContext?: {
    url: string;
    title: string | null;
    domTextSample: string;
    logs: { level: string; message: string }[];
    uiInventory?: unknown;
  } | null;
  lastError?: string | null;
  loopSignal: LoopSignal;
  completedIndex: number;
  currentPlan: PlanStep[];
  maxSteps: number;
}): Promise<ParsedLoopGuardResponse | null> => {
  const content = await runLoopGuardTask({
    model: args.model,
    systemPrompt:
      'You are a loop-guard. Output only JSON with keys: action, reason, questions, evidence, goals, critique, alternatives, taskType, summary, constraints, successSignals. action is \'continue\', \'replan\', or \'wait_human\'. Provide 2-4 questions that test whether the agent is looping. If action is \'replan\', include goals (planner schema) or steps: array of {title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}.',
    userContent: buildLoopGuardUserContent(args),
  });
  return parsePlanJson(content) as ParsedLoopGuardResponse | null;
};

export interface LoopGuardReviewArgs {
  prompt: string;
  memory: string[];
  model: string;
  browserContext?: {
    url: string;
    title: string | null;
    domTextSample: string;
    logs: { level: string; message: string }[];
    uiInventory?: unknown;
  } | null;
  currentPlan: PlanStep[];
  completedIndex: number;
  loopSignal: LoopSignal;
  lastError?: string | null;
  runId?: string;
  maxSteps: number;
  maxStepAttempts: number;
}

export interface LoopGuardReviewResult {
  action: 'continue' | 'replan' | 'wait_human';
  reason?: string;
  questions?: string[];
  evidence?: string[];
  steps: PlanStep[];
  hierarchy?: ReturnType<typeof normalizePlanHierarchy> | null;
  meta?: PlannerMeta | null;
}

export async function buildLoopGuardReview(args: LoopGuardReviewArgs): Promise<LoopGuardReviewResult> {
  const { runId, maxSteps, maxStepAttempts, loopSignal } = args;

  try {
    const parsed = await performLoopGuardReview(args);
    if (!parsed) return { action: 'continue', steps: [] };

    const action =
      parsed.action === 'replan' || parsed.action === 'wait_human' ? parsed.action : 'continue';
    const meta = normalizePlannerMeta(parsed);
    const hierarchy = normalizePlanHierarchy(parsed);
    const steps = resolveLoopGuardSteps({ parsed, action, meta, maxSteps, maxStepAttempts });

    await recordLoopGuardAudit(runId, action, parsed.reason ?? null, loopSignal);

    return {
      action,
      ...(parsed.reason !== undefined && parsed.reason !== '' && { reason: parsed.reason }),
      questions: normalizeStringList(parsed.questions),
      evidence: normalizeStringList(parsed.evidence),
      steps,
      hierarchy,
      meta,
    };
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'agent-engine',
      feature: 'agent-runtime',
      action: 'loop-guard',
      runId,
    });
    return { action: 'continue', steps: [] };
  }
}

