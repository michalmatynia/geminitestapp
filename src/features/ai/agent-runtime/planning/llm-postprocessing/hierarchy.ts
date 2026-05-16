import 'server-only';

import {
  normalizePlanHierarchy,
  parsePlanJson,
} from '@/features/ai/agent-runtime/planning/utils';
import type { PlannerMeta } from '@/shared/contracts/agent-runtime';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { runPlanningPostprocessTask, recordPostprocessAudit } from './core';

type NormalizablePlanGoals = Parameters<typeof normalizePlanHierarchy>[0]['goals'];

export async function enrichPlanHierarchyWithLLM(args: {
  prompt: string;
  model: string;
  memory: string[];
  hierarchy: ReturnType<typeof normalizePlanHierarchy>;
  meta?: PlannerMeta | null;
  runId?: string;
}): Promise<ReturnType<typeof normalizePlanHierarchy> | null> {
  const { prompt, model, memory, hierarchy, meta, runId } = args;
  try {
    const content = await runPlanningPostprocessTask({
      model,
      systemPrompt: 'You enrich goal hierarchies. Output only JSON: {goals:[]}.',
      userContent: JSON.stringify({ prompt, memory, hierarchy, meta }),
    });
    const parsed = parsePlanJson(content) as { goals?: NormalizablePlanGoals } | null;
    if (!Array.isArray(parsed?.goals) || parsed.goals.length === 0) return null;
    const enriched = normalizePlanHierarchy({ goals: parsed.goals });
    if (enriched === null) return null;
    await recordPostprocessAudit(runId, 'Plan hierarchy enriched.', { goals: enriched.goals.length });
    return enriched;
  } catch (error) {
    void ErrorSystem.captureException(error, { service: 'agent-runtime.planning', action: 'enrichPlanHierarchyWithLLM', runId: runId ?? null });
    return null;
  }
}

export async function expandHierarchyFromStepsWithLLM(args: {
  prompt: string;
  model: string;
  memory: string[];
  steps: Array<{
    title?: string;
    tool?: string;
    expectedObservation?: string;
    successCriteria?: string;
    phase?: string;
    priority?: number;
    dependsOn?: number[] | string[];
  }>;
  meta?: PlannerMeta | null;
  runId?: string;
}): Promise<ReturnType<typeof normalizePlanHierarchy> | null> {
  const { prompt, model, memory, steps, meta, runId } = args;
  if (steps.length === 0) return null;
  try {
    const content = await runPlanningPostprocessTask({
      model,
      systemPrompt: 'You convert flat steps into a goal hierarchy. Output only JSON: {goals:[]}.',
      userContent: JSON.stringify({ prompt, memory, steps, meta }),
    });
    const parsed = parsePlanJson(content) as { goals?: NormalizablePlanGoals } | null;
    if (!Array.isArray(parsed?.goals) || parsed.goals.length === 0) return null;
    const expanded = normalizePlanHierarchy({ goals: parsed.goals });
    if (expanded === null) return null;
    await recordPostprocessAudit(runId, 'Plan hierarchy expanded.', { goals: expanded.goals.length });
    return expanded;
  } catch (error) {
    void ErrorSystem.captureException(error, { service: 'agent-runtime.planning', action: 'expandHierarchyFromStepsWithLLM', runId: runId ?? null });
    return null;
  }
}
