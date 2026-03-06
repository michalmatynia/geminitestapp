import 'server-only';

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */

/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { randomUUID } from 'crypto';

import {
  MAX_PLAN_STEPS,
  MAX_STEP_ATTEMPTS,
  clampInt,
} from '@/features/ai/agent-runtime/core/config';
import {
  buildBranchStepsFromAlternatives,
  buildPlan,
  buildPlanStepsFromSpecs,
  decideNextAction,
  flattenPlanHierarchy,
  normalizeDecision,
  normalizePlanHierarchy,
  normalizePlannerMeta,
  parsePlanJson,
} from '@/features/ai/agent-runtime/planning/utils';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import type { AgentDecision, PlanStep, PlannerMeta } from '@/shared/contracts/agent-runtime';

import { evaluatePlanWithLLM } from './llm-evaluation';
import {
  dedupePlanStepsWithLLM,
  enrichPlanHierarchyWithLLM,
  expandHierarchyFromStepsWithLLM,
  guardRepetitionWithLLM,
  optimizePlanWithLLM,
} from './llm-postprocessing';
import { normalizePlanStepSpecs } from './llm-step-specs';
import { buildAdaptivePlanReview } from './llm/review';

import { runPlannerTask } from './llm/core';

export { runPlannerTask };
export { summarizePlannerMemoryWithLLM, buildCheckpointBriefWithLLM } from './llm/summarization';
export { buildAdaptivePlanReview, buildSelfCheckReview } from './llm/review';
export { guardRepetitionWithLLM } from './llm-postprocessing';
export {
  buildMidRunAdaptationWithLLM,
  evaluatePlanWithLLM,
  buildSelfImprovementReviewWithLLM,
  verifyPlanWithLLM,
} from './llm-evaluation';

type BuildPlanWithLLMResult = {
  steps: PlanStep[];
  decision: AgentDecision;
  source: 'llm' | 'heuristic';
  branchSteps?: PlanStep[];
  meta?: PlannerMeta;
  hierarchy?: {
    goals: Array<{
      id: string;
      title: string;
      successCriteria?: string | null;
      subgoals: Array<{
        id: string;
        title: string;
        successCriteria?: string | null;
        steps: Array<{
          title: string;
          tool?: 'playwright' | 'none';
          expectedObservation?: string | null;
          successCriteria?: string | null;
        }>;
      }>;
    }>;
  } | null;
};

export async function buildResumePlanReview({
  prompt,
  memory,
  model,
  browserContext,
  currentPlan,
  completedIndex,
  lastError,
  runId,
  maxSteps,
  maxStepAttempts,
}: {
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
  lastError?: string | null;
  runId?: string;
  maxSteps: number;
  maxStepAttempts: number;
}): Promise<{
  shouldReplan: boolean;
  reason?: string;
  summary?: string | null;
  steps: PlanStep[];
  hierarchy?: {
    goals: Array<{
      id: string;
      title: string;
      successCriteria?: string | null;
      subgoals: Array<{
        id: string;
        title: string;
        successCriteria?: string | null;
        steps: Array<{
          title: string;
          tool?: 'playwright' | 'none';
          expectedObservation?: string | null;
          successCriteria?: string | null;
        }>;
      }>;
    }>;
  } | null;
  meta?: PlannerMeta;
}> {
  const review = await buildAdaptivePlanReview({
    prompt,
    memory,
    model,
    browserContext,
    currentPlan,
    completedIndex,
    runId,
    maxSteps,
    maxStepAttempts,
    trigger: 'resume',
    ...(lastError ? { signals: { lastError } } : {}),
  });

  return {
    ...review,
    meta: review.meta ?? undefined,
    summary: review.meta?.summary ?? null,
  };
}

export async function buildPlanWithLLM({
  prompt,
  memory,
  model,
  guardModel,
  previousPlan,
  lastError,
  runId,
  browserContext,
  mode = 'plan',
  failedStep,
  maxSteps: maxStepsParam,
  maxStepAttempts: maxStepAttemptsParam,
}: {
  prompt: string;
  memory: string[];
  model: string;
  guardModel?: string;
  previousPlan?: PlanStep[];
  lastError?: string | null;
  runId?: string;
  browserContext?: {
    url: string;
    title: string | null;
    domTextSample: string;
    logs: { level: string; message: string }[];
    uiInventory?: unknown;
  } | null;
  mode?: 'plan' | 'branch';
  failedStep?: {
    id: string;
    title: string;
    expectedObservation?: string | null;
    successCriteria?: string | null;
  } | null;
  maxSteps?: number;
  maxStepAttempts?: number;
}): Promise<BuildPlanWithLLMResult> {
  const maxSteps = Math.min(Math.max(maxStepsParam ?? MAX_PLAN_STEPS, 1), 20);
  const maxStepAttempts = clampInt(
    maxStepAttemptsParam ?? MAX_STEP_ATTEMPTS,
    1,
    5,
    MAX_STEP_ATTEMPTS
  );
  const repetitionModel =
    typeof guardModel === 'string' && guardModel.trim() ? guardModel.trim() : model;
  const fallbackPlanTitles = buildPlan(prompt, maxSteps);
  const fallbackSteps = fallbackPlanTitles.map((title: string) => ({
    id: randomUUID(),
    title,
    status: 'pending' as const,
    tool: 'playwright' as const,
    expectedObservation: null,
    successCriteria: null,
    phase: 'act' as const,
    priority: null,
    dependsOn: null,
    attempts: 0,
    maxAttempts: maxStepAttempts,
  }));

  try {
    const systemPrompt =
      mode === 'branch'
        ? "You are an agent planner. Output only JSON with keys: decision, branchSteps, critique, alternatives, taskType, summary, constraints, successSignals. decision: {action, reason, toolName}. branchSteps: array of {title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}. critique: {assumptions[], risks[], unknowns[], safetyChecks[], questions[]}. alternatives: array of {title, rationale, steps:[{title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}]}. taskType is 'web_task' or 'extract_info'. summary is a 1-2 sentence plan summary. constraints is an array of key constraints. successSignals is a list of observable success indicators. Provide 1-4 alternate steps to recover from the failed step. tool is 'playwright' or 'none'."
        : `You are an agent planner. Output only JSON with keys: decision, goals, critique, alternatives, taskType, summary, constraints, successSignals. decision: {action, reason, toolName}. goals: array of {title, successCriteria, priority, dependsOn, subgoals:[{title, successCriteria, priority, dependsOn, steps:[{title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}]}]}. critique: {assumptions[], risks[], unknowns[], safetyChecks[], questions[]}. alternatives: array of {title, rationale, steps:[{title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}]}. taskType is 'web_task' or 'extract_info'. summary is a 1-2 sentence plan summary. constraints is an array of key constraints. successSignals is a list of observable success indicators. Use 2-4 goals, 1-3 subgoals each, and max ${maxSteps} total steps. tool is 'playwright' or 'none'. If you cannot provide goals, you may include steps: array of {title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}.`;
    const content = await runPlannerTask({
      model,
      systemPrompt,
      userContent: JSON.stringify({
        prompt,
        memory,
        previousPlan,
        lastError,
        browserContext,
        maxSteps,
        mode,
        failedStep,
      }),
    });
    const parsed = parsePlanJson(content) as any;
    if (!parsed) {
      throw new Error('Planner LLM returned invalid JSON.');
    }
    const meta = normalizePlannerMeta(parsed);
    let hierarchy = mode === 'plan' ? normalizePlanHierarchy(parsed) : null;
    if (!hierarchy && mode === 'plan' && Array.isArray(parsed.steps)) {
      const expanded = await expandHierarchyFromStepsWithLLM({
        prompt,
        model,
        memory,
        steps: parsed.steps,
        meta,
        ...(runId && { runId }),
      });
      if (expanded) {
        hierarchy = expanded;
      }
    }
    if (hierarchy) {
      const enriched = await enrichPlanHierarchyWithLLM({
        prompt,
        model,
        memory,
        hierarchy,
        meta,
        ...(runId && { runId }),
      });
      if (enriched) {
        hierarchy = enriched;
      }
    }
    const hierarchySteps = hierarchy ? flattenPlanHierarchy(hierarchy) : [];
    const stepSpecs = hierarchySteps.length > 0 ? hierarchySteps : (parsed.steps ?? []);
    const normalizedStepSpecs = normalizePlanStepSpecs(stepSpecs);
    let steps = buildPlanStepsFromSpecs(
      normalizedStepSpecs,
      meta,
      mode === 'plan',
      maxStepAttempts
    ).slice(0, maxSteps);
    const dedupeResult = await dedupePlanStepsWithLLM({
      prompt,
      model: repetitionModel,
      memory,
      steps,
      meta,
      ...(runId && { runId }),
      maxSteps,
      maxStepAttempts,
    });
    if (dedupeResult.length > 0) {
      steps = dedupeResult;
    }
    const initialGuarded = await guardRepetitionWithLLM({
      prompt,
      model: repetitionModel,
      memory,
      currentPlan: steps,
      candidateSteps: steps,
      ...(runId && { runId }),
      maxSteps,
    });
    if (initialGuarded.length > 0) {
      steps = initialGuarded;
    }
    if (mode === 'plan') {
      const evaluation = await evaluatePlanWithLLM({
        prompt,
        model,
        memory,
        steps,
        hierarchy,
        meta,
        ...(runId && { runId }),
        maxSteps,
        maxStepAttempts,
      });
      if (evaluation && evaluation.score < 70 && evaluation.revisedSteps.length) {
        steps = evaluation.revisedSteps;
      }
      const optimization = await optimizePlanWithLLM({
        prompt,
        model: repetitionModel,
        memory,
        steps,
        hierarchy,
        meta,
        ...(runId && { runId }),
        maxSteps,
        maxStepAttempts,
      });
      if (optimization?.optimizedSteps?.length) {
        steps = optimization.optimizedSteps;
      }
    }
    const branchSpecs = (parsed.branchSteps ?? parsed.steps ?? []).slice(0, 4);
    const branchSteps: PlanStep[] = branchSpecs.map(
      (step: {
        title?: string;
        tool?: string;
        expectedObservation?: string;
        successCriteria?: string;
      }) => ({
        id: randomUUID(),
        title: step.title?.trim() || 'Review the page state.',
        status: 'pending' as const,
        tool: step.tool === 'none' ? 'none' : 'playwright',
        expectedObservation: step.expectedObservation?.trim() || null,
        successCriteria: step.successCriteria?.trim() || null,
        attempts: 0,
        maxAttempts: maxStepAttempts,
      })
    );
    const fallbackBranchSteps = buildBranchStepsFromAlternatives(
      (meta as any)?.alternatives ?? undefined,
      maxStepAttempts,
      maxSteps
    );
    const decision = normalizeDecision(parsed.decision, steps, prompt, memory);
    return {
      steps: steps.length ? steps : fallbackSteps,
      decision,
      source: 'llm',
      ...(meta && { meta }),
      ...(hierarchy && { hierarchy }),
      ...(branchSteps.length
        ? { branchSteps }
        : fallbackBranchSteps.length
          ? { branchSteps: fallbackBranchSteps }
          : {}),
    };
  } catch (error) {
    void ErrorSystem.logWarning('[chatbot][agent][engine] Planner fallback', {
      runId,
      error,
    });
    return {
      steps: fallbackSteps,
      decision: decideNextAction(prompt, memory),
      source: 'heuristic',
    };
  }
}
