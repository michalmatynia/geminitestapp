import 'server-only';

import {
  buildPlanStepsFromSpecs,
  flattenPlanHierarchy,
  normalizePlanHierarchy,
  parsePlanJson,
} from '@/features/ai/agent-runtime/planning/utils';
import type { PlanStep, PlannerMeta } from '@/shared/contracts/agent-runtime';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { normalizePlanStepSpecs, type PlanStepSpecInput } from '../llm-step-specs';
import { runPlanningPostprocessTask } from './core';

interface ParsedOptimizationResponse {
  reason?: string;
  optimizedGoals?: any[];
  optimizedSteps?: PlanStepSpecInput[];
}

const resolveOptSpecs = (parsed: ParsedOptimizationResponse): PlanStepSpecInput[] => {
  const hierarchy = Array.isArray(parsed.optimizedGoals) ? normalizePlanHierarchy({ goals: parsed.optimizedGoals }) : null;
  if (hierarchy && hierarchy.goals.length > 0) {
    return flattenPlanHierarchy(hierarchy);
  }
  return Array.isArray(parsed.optimizedSteps) ? parsed.optimizedSteps : [];
};

export interface OptimizePlanArgs {
  prompt: string;
  model: string;
  memory: string[];
  steps: PlanStep[];
  hierarchy: ReturnType<typeof normalizePlanHierarchy> | null;
  meta: PlannerMeta | null;
  runId?: string;
  maxSteps: number;
  maxStepAttempts: number;
}

export async function optimizePlanWithLLM(args: OptimizePlanArgs): Promise<{
  reason: string | null;
  optimizedSteps: PlanStep[];
} | null> {
  const { prompt, model, memory, steps, hierarchy, meta, runId, maxSteps, maxStepAttempts } = args;
  if (steps.length < 2) return null;
  try {
    const content = await runPlanningPostprocessTask({
      model,
      systemPrompt: 'You optimize action plans. Output only JSON: {reason:\'\', optimizedGoals:[], optimizedSteps:[]}.',
      userContent: JSON.stringify({
        prompt, memory, steps: steps.map(s => ({ title: s.title, tool: s.tool })), hierarchy, meta, maxSteps,
      }),
    });
    const parsed = parsePlanJson(content) as ParsedOptimizationResponse | null;
    if (!parsed) return null;
    const specs = resolveOptSpecs(parsed);
    const optimizedSteps = specs.length > 0
      ? buildPlanStepsFromSpecs(normalizePlanStepSpecs(specs), meta, true, maxStepAttempts).slice(0, maxSteps)
      : [];
    return { reason: parsed.reason ?? null, optimizedSteps };
  } catch (error) {
    void ErrorSystem.captureException(error, { service: 'agent-runtime.planning', action: 'optimizePlanWithLLM', runId: runId ?? null });
    return null;
  }
}
