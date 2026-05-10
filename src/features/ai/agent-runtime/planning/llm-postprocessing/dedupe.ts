import 'server-only';

import {
  buildPlanStepsFromSpecs,
  parsePlanJson,
} from '@/features/ai/agent-runtime/planning/utils';
import type { PlanStep, PlannerMeta } from '@/shared/contracts/agent-runtime';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { normalizePlanStepSpecs, type PlanStepSpecInput } from '../llm-step-specs';
import { runPlanningPostprocessTask, recordPostprocessAudit } from './core';

export interface DedupePlanStepsArgs {
  prompt: string;
  model: string;
  memory: string[];
  steps: PlanStep[];
  meta?: PlannerMeta | null;
  runId?: string;
  maxSteps: number;
  maxStepAttempts: number;
}

export async function dedupePlanStepsWithLLM(args: DedupePlanStepsArgs): Promise<PlanStep[]> {
  const { prompt, model, memory, steps, meta, runId, maxSteps, maxStepAttempts } = args;
  if (steps.length < 2) return steps;
  try {
    const content = await runPlanningPostprocessTask({
      model,
      systemPrompt: 'You remove redundant plan steps. Output only JSON: {steps:[]}.',
      userContent: JSON.stringify({ prompt, memory, steps: steps.map(s => ({ title: s.title, tool: s.tool })), meta, maxSteps }),
    });
    const parsed = parsePlanJson(content) as { steps?: PlanStepSpecInput[] } | null;
    const rawSteps = Array.isArray(parsed?.steps) ? parsed.steps : [];
    if (rawSteps.length === 0) return steps;
    const deduped = buildPlanStepsFromSpecs(normalizePlanStepSpecs(rawSteps), meta, true, maxStepAttempts).slice(0, maxSteps);
    await recordPostprocessAudit(runId, 'Plan dedupe completed.', { before: steps.length, after: deduped.length });
    return deduped;
  } catch (error) {
    void ErrorSystem.captureException(error, { service: 'agent-runtime.planning', action: 'dedupePlanStepsWithLLM', runId: runId ?? null });
    return steps;
  }
}

export interface GuardRepetitionArgs {
  prompt: string;
  model: string;
  memory: string[];
  currentPlan: PlanStep[];
  candidateSteps: PlanStep[];
  runId?: string;
  maxSteps: number;
}

export async function guardRepetitionWithLLM(args: GuardRepetitionArgs): Promise<PlanStep[]> {
  const { prompt, model, memory, currentPlan, candidateSteps, runId, maxSteps } = args;
  if (candidateSteps.length < 2) return candidateSteps;
  try {
    const content = await runPlanningPostprocessTask({
      model,
      systemPrompt: 'You remove unnecessary repetition. Output only JSON: {steps:[]}.',
      userContent: JSON.stringify({ 
        prompt, memory, 
        recent: currentPlan.map(s => ({ title: s.title, status: s.status })),
        candidates: candidateSteps.map(s => ({ title: s.title, tool: s.tool })),
        maxSteps 
      }),
    });
    const parsed = parsePlanJson(content) as { steps?: PlanStepSpecInput[] } | null;
    const rawSteps = Array.isArray(parsed?.steps) ? parsed.steps : [];
    if (rawSteps.length === 0) return candidateSteps;
    const guarded = buildPlanStepsFromSpecs(normalizePlanStepSpecs(rawSteps), null, true).slice(0, maxSteps);
    await recordPostprocessAudit(runId, 'Repetition guard applied.', { before: candidateSteps.length, after: guarded.length });
    return guarded;
  } catch (error) {
    void ErrorSystem.captureException(error, { service: 'agent-runtime.planning', action: 'guardRepetitionWithLLM', runId: runId ?? null });
    return candidateSteps;
  }
}
