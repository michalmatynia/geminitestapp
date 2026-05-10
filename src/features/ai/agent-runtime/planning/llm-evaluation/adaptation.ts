import 'server-only';

import {
  buildBranchStepsFromAlternatives,
  buildPlanStepsFromSpecs,
  flattenPlanHierarchy,
  normalizePlanHierarchy,
  normalizePlannerMeta,
  parsePlanJson,
} from '@/features/ai/agent-runtime/planning/utils';
import type {
  PlanStep,
  PlannerAlternative,
  PlannerCritique,
  PlannerMeta,
} from '@/shared/contracts/agent-runtime';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { normalizePlanStepSpecs, type PlanStepSpecInput } from '../llm-step-specs';
import { runPlanningEvaluationTask } from './core';

interface ParsedAdaptationResponse {
  shouldAdapt?: boolean;
  reason?: string;
  steps?: PlanStepSpecInput[];
  goals?: any[];
  critique?: PlannerCritique;
  alternatives?: PlannerAlternative[];
  summary?: string;
  constraints?: string[];
  successSignals?: string[];
  taskType?: string;
}

const resolveAdaptationSteps = (args: {
  parsed: ParsedAdaptationResponse;
  meta: PlannerMeta;
  maxSteps: number;
  maxStepAttempts: number;
}): PlanStep[] => {
  const { parsed, meta, maxSteps, maxStepAttempts } = args;
  const hierarchy = normalizePlanHierarchy({ goals: Array.isArray(parsed.goals) ? parsed.goals : [] });
  const hierarchySteps = hierarchy ? flattenPlanHierarchy(hierarchy) : [];
  const rawSteps = Array.isArray(parsed.steps) ? parsed.steps : [];
  const stepSpecs = (hierarchySteps.length > 0) ? hierarchySteps : rawSteps;
  
  const steps = buildPlanStepsFromSpecs(
    normalizePlanStepSpecs(stepSpecs as PlanStepSpecInput[]),
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

export async function buildMidRunAdaptationWithLLM(args: {
  prompt: string;
  model: string;
  memory: string[];
  steps: PlanStep[];
  browserContext?: {
    url: string;
    title: string | null;
    domTextSample: string;
    logs: { level: string; message: string }[];
    uiInventory?: unknown;
  } | null;
  runId?: string;
  maxSteps: number;
  maxStepAttempts: number;
}): Promise<{
  shouldAdapt: boolean;
  reason?: string;
  steps: PlanStep[];
  hierarchy?: ReturnType<typeof normalizePlanHierarchy> | null;
  meta?: PlannerMeta | null;
}> {
  const { prompt, model, memory, steps, browserContext, runId, maxSteps, maxStepAttempts } = args;
  try {
    const content = await runPlanningEvaluationTask({
      model,
      systemPrompt: 'You are an adaptation planner. Output only JSON: {shouldAdapt:boolean, reason:\'\', goals:[], steps:[]}.',
      userContent: JSON.stringify({
        prompt, memory, steps: steps.map(s => ({ title: s.title, status: s.status })), browserContext, maxSteps,
      }),
    });
    const parsed = parsePlanJson(content) as ParsedAdaptationResponse | null;
    if (parsed?.shouldAdapt !== true) return { shouldAdapt: false, steps: [] };
    
    const meta = normalizePlannerMeta(parsed);
    const hierarchy = normalizePlanHierarchy({ goals: Array.isArray(parsed.goals) ? parsed.goals : [] });
    const adaptationSteps = resolveAdaptationSteps({ parsed, meta, maxSteps, maxStepAttempts });
    
    return {
      shouldAdapt: true,
      reason: (typeof parsed.reason === 'string') ? parsed.reason : undefined,
      steps: adaptationSteps,
      hierarchy,
      meta,
    };
  } catch (error) {
    void ErrorSystem.captureException(error, { service: 'agent-runtime.planning', action: 'buildMidRunAdaptationWithLLM', runId: runId ?? null });
    return { shouldAdapt: false, steps: [] };
  }
}
