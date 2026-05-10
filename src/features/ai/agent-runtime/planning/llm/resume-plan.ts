import 'server-only';

import {
  buildPlanStepsFromSpecs,
  flattenPlanHierarchy,
  normalizePlanHierarchy,
  normalizePlannerMeta,
  parsePlanJson,
} from '@/features/ai/agent-runtime/planning/utils';
import type {
  PlannerMeta,
  PlanStep,
} from '@/shared/contracts/agent-runtime';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { normalizePlanStepSpecs, type PlanStepSpecInput } from '../llm-step-specs';
import { runPlannerTask } from './core';

interface ParsedResumeResponse {
  shouldReplan?: boolean;
  reason?: string;
  summary?: string;
  steps?: PlanStepSpecInput[];
  goals?: any[];
  taskType?: string;
}

const resolveResumeSteps = (args: {
  parsed: ParsedResumeResponse;
  meta: PlannerMeta;
  maxSteps: number;
  maxStepAttempts: number;
}): PlanStep[] => {
  const { parsed, meta, maxSteps, maxStepAttempts } = args;
  const hierarchy = Array.isArray(parsed.goals) ? normalizePlanHierarchy({ goals: parsed.goals }) : null;
  let specs: PlanStepSpecInput[] = [];
  if (hierarchy !== null && hierarchy.goals.length > 0) {
    specs = flattenPlanHierarchy(hierarchy);
  } else if (Array.isArray(parsed.steps)) {
    specs = parsed.steps;
  }
  
  if (specs.length === 0) return [];
  return buildPlanStepsFromSpecs(
    normalizePlanStepSpecs(specs),
    meta,
    true,
    maxStepAttempts
  ).slice(0, maxSteps);
};

export interface BuildResumePlanReviewArgs {
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
  lastError: string | null;
  runId: string;
  maxSteps: number;
  maxStepAttempts: number;
}

export async function buildResumePlanReview(args: BuildResumePlanReviewArgs): Promise<{
  shouldReplan: boolean;
  reason?: string;
  summary?: string;
  steps: PlanStep[];
  hierarchy?: ReturnType<typeof normalizePlanHierarchy> | null;
  meta?: PlannerMeta | null;
}> {
  const { prompt, memory, model, browserContext, currentPlan, completedIndex, lastError, runId, maxSteps, maxStepAttempts } = args;
  try {
    const content = await runPlannerTask({
      model,
      systemPrompt: 'You review paused plans. Output only JSON: {shouldReplan:boolean, reason:\'\', summary:\'\', goals:[], steps:[]}.',
      userContent: JSON.stringify({
        prompt, memory, browserContext, lastError, completedIndex, 
        plan: currentPlan.map(s => ({ title: s.title, status: s.status })),
        maxSteps 
      }),
    });
    const parsed = parsePlanJson(content) as ParsedResumeResponse | null;
    if (parsed?.shouldReplan !== true) {
      return { shouldReplan: false, reason: parsed?.reason, summary: parsed?.summary, steps: [] };
    }
    const meta = normalizePlannerMeta(parsed);
    const hierarchy = Array.isArray(parsed.goals) ? normalizePlanHierarchy({ goals: parsed.goals }) : null;
    const steps = resolveResumeSteps({ parsed, meta, maxSteps, maxStepAttempts });
    
    return { shouldReplan: true, reason: parsed.reason, summary: parsed.summary, steps, hierarchy, meta };
  } catch (error) {
    void ErrorSystem.captureException(error, { service: 'agent-runtime.planning', action: 'buildResumePlanReview', runId });
    return { shouldReplan: false, steps: [] };
  }
}
