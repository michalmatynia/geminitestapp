import 'server-only';

import { randomUUID } from 'crypto';

import { runBrainChatCompletion } from '@/shared/lib/ai-brain/server-runtime-client';
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
  normalizeStringList,
  parsePlanJson,
} from '@/features/ai/agent-runtime/planning/utils';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import type {
  AgentDecision,
  PlanStep,
  PlannerAlternative,
  PlannerCritique,
  PlannerMeta,
} from '@/shared/contracts/agent-runtime';

import { evaluatePlanWithLLM } from './llm-evaluation';
import {
  dedupePlanStepsWithLLM,
  enrichPlanHierarchyWithLLM,
  expandHierarchyFromStepsWithLLM,
  guardRepetitionWithLLM,
  optimizePlanWithLLM,
} from './llm-postprocessing';
import { normalizePlanStepSpecs } from './llm-step-specs';

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

const runPlannerTask = async (input: {
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
        ? 'You are an agent planner. Output only JSON with keys: decision, branchSteps, critique, alternatives, taskType, summary, constraints, successSignals. decision: {action, reason, toolName}. branchSteps: array of {title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}. critique: {assumptions[], risks[], unknowns[], safetyChecks[], questions[]}. alternatives: array of {title, rationale, steps:[{title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}]}. taskType is \'web_task\' or \'extract_info\'. summary is a 1-2 sentence plan summary. constraints is an array of key constraints. successSignals is a list of observable success indicators. Provide 1-4 alternate steps to recover from the failed step. tool is \'playwright\' or \'none\'.'
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
    const parsed = parsePlanJson(content) as {
      decision?: Partial<AgentDecision>;
      steps?: Array<{
        title?: string;
        tool?: string;
        expectedObservation?: string;
        successCriteria?: string;
        phase?: string;
        priority?: number;
        dependsOn?: number[] | string[];
      }>;
      branchSteps?: Array<{
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
      critique?: PlannerCritique;
      alternatives?: PlannerAlternative[];
      taskType?: string;
      summary?: string;
      constraints?: string[];
      successSignals?: string[];
    } | null;
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
      meta?.alternatives ?? undefined,
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
    void (ErrorSystem as any).logWarning('[chatbot][agent][engine] Planner fallback', {
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

export async function buildAdaptivePlanReview({
  prompt,
  memory,
  model,
  browserContext,
  currentPlan,
  completedIndex,
  runId,
  maxSteps,
  maxStepAttempts,
  trigger,
  signals,
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
  runId?: string;
  maxSteps: number;
  maxStepAttempts: number;
  trigger?: string;
  signals?: Record<string, unknown>;
}): Promise<{
  shouldReplan: boolean;
  reason?: string;
  steps: PlanStep[];
  hierarchy?: ReturnType<typeof normalizePlanHierarchy> | null;
  meta?: PlannerMeta | null;
}> {
  try {
    const systemPrompt =
      'You are an agent replanner. Output only JSON with keys: shouldReplan, reason, goals, critique, alternatives, taskType, summary, constraints, successSignals. shouldReplan is boolean. taskType is \'web_task\' or \'extract_info\'. If shouldReplan is true, include goals (same schema as planner with priority/dependsOn) or steps: array of {title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}. critique: {assumptions[], risks[], unknowns[], safetyChecks[], questions[]}. alternatives: array of {title, rationale, steps:[{title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}]}. summary is a short plan summary. constraints and successSignals are arrays. The user input includes trigger and signals fields; use them to focus the replan.';
    const content = await runPlannerTask({
      model,
      systemPrompt,
      userContent: JSON.stringify({
        prompt,
        memory,
        trigger,
        signals,
        browserContext,
        completedStepIndex: completedIndex,
        currentPlan: currentPlan.map((step: PlanStep) => ({
          title: step.title,
          status: step.status,
          tool: step.tool,
          expectedObservation: step.expectedObservation,
          successCriteria: step.successCriteria,
        })),
        maxSteps,
      }),
    });
    const parsed = parsePlanJson(content) as {
      shouldReplan?: boolean;
      reason?: string;
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
      critique?: PlannerCritique;
      alternatives?: PlannerAlternative[];
      summary?: string;
      constraints?: string[];
      successSignals?: string[];
      taskType?: string;
    } | null;
    if (!parsed) {
      throw new Error('Planner review returned invalid JSON.');
    }
    const shouldReplan = Boolean(parsed.shouldReplan);
    const meta = normalizePlannerMeta(parsed);
    const hierarchy = normalizePlanHierarchy(parsed);
    const hierarchySteps = hierarchy ? flattenPlanHierarchy(hierarchy) : [];
    const stepSpecs = hierarchySteps.length > 0 ? hierarchySteps : (parsed.steps ?? []);
    const normalizedStepSpecs = normalizePlanStepSpecs(stepSpecs);
    let steps = shouldReplan
      ? buildPlanStepsFromSpecs(normalizedStepSpecs, meta, true, maxStepAttempts).slice(0, maxSteps)
      : [];
    if (shouldReplan && steps.length === 0) {
      const fallbackBranch = buildBranchStepsFromAlternatives(
        meta?.alternatives ?? undefined,
        maxStepAttempts,
        maxSteps
      );
      if (fallbackBranch.length > 0) {
        steps = fallbackBranch;
      }
    }
    if (shouldReplan && steps.length === 0) {
      const result: {
        shouldReplan: boolean;
        reason?: string;
        steps: PlanStep[];
      } = { shouldReplan: false, steps: [] };
      if (typeof parsed.reason === 'string') {
        result.reason = parsed.reason;
      }
      return result;
    }
    const result: {
      shouldReplan: boolean;
      reason?: string;
      steps: PlanStep[];
      hierarchy?: ReturnType<typeof normalizePlanHierarchy> | null;
      meta?: PlannerMeta | null;
    } = {
      shouldReplan,
      steps,
      hierarchy,
      meta,
    };
    if (typeof parsed.reason === 'string') {
      result.reason = parsed.reason;
    }
    return result;
  } catch (error) {
    void (ErrorSystem as any).logWarning('[chatbot][agent][engine] Planner review fallback', {
      ...(runId && { runId }),
      error,
    });
    return { shouldReplan: false, steps: [] };
  }
}

export async function buildSelfCheckReview({
  prompt,
  memory,
  model,
  browserContext,
  step,
  stepIndex,
  lastError,
  taskType,
  completedCount,
  previousUrl,
  lastContextUrl,
  stagnationCount,
  noContextCount,
  replanCount,
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
}): Promise<{
  action: 'continue' | 'replan' | 'wait_human';
  reason?: string;
  notes?: string;
  questions?: string[];
  evidence?: string[];
  confidence?: number;
  missingInfo?: string[];
  blockers?: string[];
  hypotheses?: string[];
  verificationSteps?: string[];
  toolSwitch?: string;
  abortSignals?: string[];
  finishSignals?: string[];
  steps: PlanStep[];
  hierarchy?: ReturnType<typeof normalizePlanHierarchy> | null;
  meta?: PlannerMeta | null;
}> {
  try {
    const systemPrompt =
      'You are an agent self-checker. Output only JSON with keys: action, reason, notes, questions, evidence, confidence, missingInfo, blockers, hypotheses, verificationSteps, toolSwitch, abortSignals, finishSignals, goals, critique, alternatives, taskType, summary, constraints, successSignals. action is \'continue\', \'replan\', or \'wait_human\'. Provide 5-8 self-questions that test assumptions, evidence quality, tool choice, and completion criteria. evidence is a list of observable facts from the context. confidence is 0-100. If action is \'replan\', include goals (planner schema with priority/dependsOn) or steps: array of {title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}. toolSwitch is a short suggestion like \'use search\' or \'use playwright\'. abortSignals are conditions that should stop the run. finishSignals are conditions that indicate the goal is satisfied. summary is a short plan summary. constraints and successSignals are arrays.';
    const content = await runPlannerTask({
      model,
      systemPrompt,
      userContent: JSON.stringify({
        prompt,
        memory,
        browserContext,
        ...(taskType && { taskType }),
        ...(lastError && { lastError }),
        ...(completedCount !== undefined && { completedCount }),
        ...(previousUrl && { previousUrl }),
        ...(lastContextUrl && { lastContextUrl }),
        ...(stagnationCount !== undefined && { stagnationCount }),
        ...(noContextCount !== undefined && { noContextCount }),
        ...(replanCount !== undefined && { replanCount }),
        step: {
          id: step.id,
          title: step.title,
          status: step.status,
          tool: step.tool,
          expectedObservation: step.expectedObservation,
          successCriteria: step.successCriteria,
        },
        stepIndex,
        maxSteps,
      }),
    });
    const parsed = parsePlanJson(content) as {
      action?: string;
      reason?: string;
      notes?: string;
      questions?: string[];
      evidence?: string[];
      confidence?: number;
      missingInfo?: string[];
      blockers?: string[];
      hypotheses?: string[];
      verificationSteps?: string[];
      toolSwitch?: string;
      abortSignals?: string[];
      finishSignals?: string[];
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
      critique?: PlannerCritique;
      alternatives?: PlannerAlternative[];
      summary?: string;
      constraints?: string[];
      successSignals?: string[];
      taskType?: string;
    } | null;
    if (!parsed) {
      throw new Error('Self-check returned invalid JSON.');
    }
    const action =
      parsed.action === 'replan' || parsed.action === 'wait_human' ? parsed.action : 'continue';
    const meta = normalizePlannerMeta(parsed);
    const hierarchy = normalizePlanHierarchy(parsed);
    const hierarchySteps = hierarchy ? flattenPlanHierarchy(hierarchy) : [];
    const stepSpecs = hierarchySteps.length > 0 ? hierarchySteps : (parsed.steps ?? []);
    const normalizedStepSpecs = normalizePlanStepSpecs(stepSpecs);
    let steps =
      action === 'replan'
        ? buildPlanStepsFromSpecs(normalizedStepSpecs, meta, true, maxStepAttempts).slice(
          0,
          maxSteps
        )
        : [];
    if (action === 'replan' && steps.length === 0) {
      const fallbackBranch = buildBranchStepsFromAlternatives(
        meta?.alternatives ?? undefined,
        maxStepAttempts,
        maxSteps
      );
      if (fallbackBranch.length > 0) {
        steps = fallbackBranch;
      }
    }
    const result: {
      action: 'continue' | 'replan' | 'wait_human';
      reason?: string;
      notes?: string;
      questions?: string[];
      evidence?: string[];
      confidence?: number;
      missingInfo?: string[];
      blockers?: string[];
      hypotheses?: string[];
      verificationSteps?: string[];
      toolSwitch?: string;
      abortSignals?: string[];
      finishSignals?: string[];
      steps: PlanStep[];
      hierarchy?: ReturnType<typeof normalizePlanHierarchy> | null;
      meta?: PlannerMeta | null;
    } = {
      action,
      questions: normalizeStringList(parsed.questions),
      evidence: normalizeStringList(parsed.evidence),
      ...(typeof parsed.confidence === 'number' && {
        confidence: parsed.confidence,
      }),
      missingInfo: normalizeStringList(parsed.missingInfo),
      blockers: normalizeStringList(parsed.blockers),
      hypotheses: normalizeStringList(parsed.hypotheses),
      verificationSteps: normalizeStringList(parsed.verificationSteps),
      ...(typeof parsed.toolSwitch === 'string' &&
        parsed.toolSwitch.trim() && { toolSwitch: parsed.toolSwitch.trim() }),
      abortSignals: normalizeStringList(parsed.abortSignals),
      finishSignals: normalizeStringList(parsed.finishSignals),
      steps,
      hierarchy,
      meta,
    };
    if (typeof parsed.reason === 'string') {
      result.reason = parsed.reason;
    }
    if (typeof parsed.notes === 'string') {
      result.notes = parsed.notes;
    }
    return result;
  } catch (error) {
    void (ErrorSystem as any).logWarning('[chatbot][agent][engine] Self-check fallback', {
      ...(runId && { runId }),
      error,
    });
    return { action: 'continue', steps: [] };
  }
}

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
  steps: PlanStep[];
  hierarchy?: ReturnType<typeof normalizePlanHierarchy> | null;
  meta?: PlannerMeta | null;
  summary?: string | null;
}> {
  try {
    const systemPrompt =
      'You are an agent resume planner. Output only JSON with keys: shouldReplan, reason, goals, critique, alternatives, taskType, summary, constraints, successSignals. shouldReplan is boolean. taskType is \'web_task\' or \'extract_info\'. If shouldReplan is true, include goals (same schema as planner with priority/dependsOn) or steps: array of {title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}. critique: {assumptions[], risks[], unknowns[], safetyChecks[], questions[]}. alternatives: array of {title, rationale, steps:[{title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}]}. summary is a short plan summary. constraints and successSignals are arrays.';
    const content = await runPlannerTask({
      model,
      systemPrompt,
      userContent: JSON.stringify({
        prompt,
        memory,
        browserContext,
        lastError,
        completedStepIndex: completedIndex,
        currentPlan: currentPlan.map((step: PlanStep) => ({
          title: step.title,
          status: step.status,
          tool: step.tool,
          expectedObservation: step.expectedObservation,
          successCriteria: step.successCriteria,
        })),
        maxSteps,
      }),
    });
    const parsed = parsePlanJson(content) as {
      shouldReplan?: boolean;
      reason?: string;
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
      critique?: PlannerCritique;
      alternatives?: PlannerAlternative[];
      summary?: string;
      constraints?: string[];
      successSignals?: string[];
      taskType?: string;
    } | null;
    if (!parsed) {
      throw new Error('Resume review returned invalid JSON.');
    }
    const shouldReplan = Boolean(parsed.shouldReplan);
    const meta = normalizePlannerMeta(parsed);
    const hierarchy = normalizePlanHierarchy(parsed);
    const hierarchySteps = hierarchy ? flattenPlanHierarchy(hierarchy) : [];
    const stepSpecs = hierarchySteps.length > 0 ? hierarchySteps : (parsed.steps ?? []);
    const normalizedStepSpecs = normalizePlanStepSpecs(stepSpecs);
    let steps = shouldReplan
      ? buildPlanStepsFromSpecs(normalizedStepSpecs, meta, true, maxStepAttempts).slice(0, maxSteps)
      : [];
    if (shouldReplan && steps.length === 0) {
      const fallbackBranch = buildBranchStepsFromAlternatives(
        meta?.alternatives ?? undefined,
        maxStepAttempts,
        maxSteps
      );
      if (fallbackBranch.length > 0) {
        steps = fallbackBranch;
      }
    }
    if (shouldReplan && steps.length === 0) {
      const result: {
        shouldReplan: boolean;
        reason?: string;
        steps: PlanStep[];
      } = { shouldReplan: false, steps: [] };
      if (typeof parsed.reason === 'string') {
        result.reason = parsed.reason;
      }
      return result;
    }
    const result: {
      shouldReplan: boolean;
      reason?: string;
      steps: PlanStep[];
      hierarchy?: ReturnType<typeof normalizePlanHierarchy> | null;
      meta?: PlannerMeta | null;
      summary?: string | null;
    } = {
      shouldReplan,
      summary: parsed.summary?.trim() || null,
      steps,
      hierarchy,
      meta,
    };
    if (typeof parsed.reason === 'string') {
      result.reason = parsed.reason;
    }
    return result;
  } catch (error) {
    void (ErrorSystem as any).logWarning('[chatbot][agent][engine] Resume planner fallback', {
      ...(runId && { runId }),
      error,
    });
    return { shouldReplan: false, steps: [] };
  }
}

export {
  buildMidRunAdaptationWithLLM,
  buildSelfImprovementReviewWithLLM,
  evaluatePlanWithLLM,
  summarizePlannerMemoryWithLLM,
  verifyPlanWithLLM,
} from './llm-evaluation';
export {
  buildCheckpointBriefWithLLM,
  dedupePlanStepsWithLLM,
  enrichPlanHierarchyWithLLM,
  expandHierarchyFromStepsWithLLM,
  guardRepetitionWithLLM,
  optimizePlanWithLLM,
} from './llm-postprocessing';
