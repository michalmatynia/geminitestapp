import {
  type PlanStep,
  type PlannerMeta,
  type AdaptivePlanReviewResult,
  type SelfCheckReviewResult,
  adaptivePlanReviewResultSchema,
  selfCheckReviewResultSchema,
} from '@/shared/contracts/agent-runtime';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { normalizePlanStepSpecs, type PlanStepSpecInput } from '../llm-step-specs';
import {
  parsePlanJson,
  normalizePlannerMeta,
  normalizePlanHierarchy,
  flattenPlanHierarchy,
  buildPlanStepsFromSpecs,
  buildBranchStepsFromAlternatives,
  normalizeStringList,
} from '../utils';
import { runPlannerTask } from './core';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

const resolveReviewSteps = (args: {
  rawParsed: unknown;
  shouldReplan: boolean;
  maxSteps: number;
  maxStepAttempts: number;
}): PlanStep[] => {
  const { rawParsed, shouldReplan, maxSteps, maxStepAttempts } = args;
  if (!shouldReplan || rawParsed === null || typeof rawParsed !== 'object') return [];
  
  const parsedObj = rawParsed as Record<string, unknown>;
  const meta = normalizePlannerMeta(parsedObj);
  const hierarchy = normalizePlanHierarchy(parsedObj);
  const hierarchySteps = hierarchy ? flattenPlanHierarchy(hierarchy) : [];
  const rawSteps = Array.isArray(parsedObj['steps']) ? parsedObj['steps'] : [];
  const stepSpecs = (hierarchySteps.length > 0) ? hierarchySteps : rawSteps;
  
  const steps = buildPlanStepsFromSpecs(
    normalizePlanStepSpecs(stepSpecs as PlanStepSpecInput[]), 
    meta, 
    true, 
    maxStepAttempts
  ).slice(0, maxSteps);

  if (steps.length === 0) {
    const fallback = buildBranchStepsFromAlternatives(meta.alternatives ?? undefined, maxStepAttempts, maxSteps);
    if (fallback.length > 0) return fallback;
  }
  return steps;
};

export async function buildAdaptivePlanReview(args: {
  prompt: string;
  memory: string[];
  model: string;
  browserContext?: unknown;
  currentPlan: PlanStep[];
  completedIndex: number;
  runId?: string;
  maxSteps: number;
  maxStepAttempts: number;
  trigger?: string;
  signals?: Record<string, unknown>;
}): Promise<AdaptivePlanReviewResult> {
  const { prompt, memory, model, browserContext, currentPlan, completedIndex, runId, maxSteps, maxStepAttempts, trigger, signals } = args;
  try {
    const content = await runPlannerTask({
      model,
      systemPrompt: 'You are an agent replanner. Output only JSON: {shouldReplan:boolean, reason:\'\', goals:[], steps:[]}.',
      userContent: JSON.stringify({
        prompt, memory, trigger, signals, browserContext, 
        completedStepIndex: completedIndex, plan: currentPlan.map(s => ({ title: s.title, status: s.status })),
        maxSteps 
      }),
    });
    const rawParsed = parsePlanJson(content);
    if (rawParsed === null || typeof rawParsed !== 'object') throw new Error('Planner review returned invalid JSON.');
    
    const parsedObj = rawParsed as Record<string, unknown>;
    const parsed = adaptivePlanReviewResultSchema.partial().parse(parsedObj);
    const shouldReplan = Boolean(parsed.shouldReplan);
    const steps = resolveReviewSteps({ rawParsed, shouldReplan, maxSteps, maxStepAttempts });
    
    if (shouldReplan && steps.length === 0) return { shouldReplan: false, steps: [] };
    
    return {
      shouldReplan,
      steps,
      hierarchy: normalizePlanHierarchy(parsedObj),
      meta: normalizePlannerMeta(parsedObj),
      reason: (typeof parsed.reason === 'string') ? parsed.reason : undefined,
    };
  } catch (error) {
    logClientError(error);
    void ErrorSystem.logWarning('[chatbot][agent][engine] Planner review fallback', { runId: runId ?? undefined, error });
    return { shouldReplan: false, steps: [] };
  }
}

const resolveSelfCheckResult = (args: {
  rawParsed: Record<string, unknown>;
  maxSteps: number;
  maxStepAttempts: number;
}): SelfCheckReviewResult => {
  const { rawParsed, maxSteps, maxStepAttempts } = args;
  const parsed = selfCheckReviewResultSchema.partial().parse(rawParsed);
  const action = (parsed.action === 'replan' || parsed.action === 'wait_human') ? parsed.action : 'continue';
  const steps = resolveReviewSteps({ rawParsed, shouldReplan: (action === 'replan'), maxSteps, maxStepAttempts });
  
  const result: SelfCheckReviewResult = {
    action,
    questions: normalizeStringList(parsed.questions),
    evidence: normalizeStringList(parsed.evidence),
    missingInfo: normalizeStringList(parsed.missingInfo),
    blockers: normalizeStringList(parsed.blockers),
    hypotheses: normalizeStringList(parsed.hypotheses),
    verificationSteps: normalizeStringList(parsed.verificationSteps),
    abortSignals: normalizeStringList(parsed.abortSignals),
    finishSignals: normalizeStringList(parsed.finishSignals),
    toolSwitch: (typeof parsed.toolSwitch === 'string') ? parsed.toolSwitch : undefined,
    confidence: (typeof parsed.confidence === 'number') ? Math.round(parsed.confidence) : undefined,
    steps,
    hierarchy: normalizePlanHierarchy(rawParsed),
    meta: normalizePlannerMeta(rawParsed),
  };
  if (typeof parsed.reason === 'string') result.reason = parsed.reason;
  if (typeof parsed.notes === 'string') result.notes = parsed.notes;
  return result;
};

export async function buildSelfCheckReview(args: {
  prompt: string;
  memory: string[];
  model: string;
  browserContext?: unknown;
  step: PlanStep;
  stepIndex: number;
  lastError?: string | null;
  taskType?: PlannerMeta['taskType'] | null;
  completedCount?: number;
  previousUrl?: string | null;
  lastContextUrl?: string | null;
  stagnationCount?: number;
  noContextCount?: number;
  replanCount?: number;
  runId?: string;
  maxSteps: number;
  maxStepAttempts: number;
}): Promise<SelfCheckReviewResult> {
  const { prompt, memory, model, browserContext, step, stepIndex, lastError, taskType, completedCount, previousUrl, lastContextUrl, stagnationCount, noContextCount, replanCount, runId, maxSteps, maxStepAttempts } = args;
  try {
    const content = await runPlannerTask({
      model,
      systemPrompt: 'You are an agent self-checker. Output only JSON: {action:\'continue\', reason:\'\', confidence:0, goals:[], steps:[]}.',
      userContent: JSON.stringify({
        prompt, memory, browserContext, taskType, lastError, completedCount,
        previousUrl, lastContextUrl, stagnationCount, noContextCount, replanCount,
        step: { id: step.id, title: step.title, tool: step.tool },
        stepIndex, maxSteps
      }),
    });
    const rawParsed = parsePlanJson(content);
    if (rawParsed === null || typeof rawParsed !== 'object') throw new Error('Self-check returned invalid JSON.');
    
    return resolveSelfCheckResult({ rawParsed: rawParsed as Record<string, unknown>, maxSteps, maxStepAttempts });
  } catch (error) {
    logClientError(error);
    void ErrorSystem.logWarning('[chatbot][agent][engine] Self-check fallback', { runId: runId ?? undefined, error });
    return { action: 'continue', steps: [] };
  }
}
