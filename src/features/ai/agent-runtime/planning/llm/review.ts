 

import { ErrorSystem } from '@/shared/utils/observability/error-system';
import {
  PlanStep,
  PlannerMeta,
  AdaptivePlanReviewResult,
  SelfCheckReviewResult,
  adaptivePlanReviewResultSchema,
  selfCheckReviewResultSchema,
} from '@/shared/contracts/agent-runtime';
import {
  parsePlanJson,
  normalizePlannerMeta,
  normalizePlanHierarchy,
  flattenPlanHierarchy,
  buildPlanStepsFromSpecs,
  buildBranchStepsFromAlternatives,
  normalizeStringList,
} from '../utils';
import { normalizePlanStepSpecs } from '../llm-step-specs';
import { runPlannerTask } from './core';

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
  browserContext?: unknown;
  currentPlan: PlanStep[];
  completedIndex: number;
  runId?: string;
  maxSteps: number;
  maxStepAttempts: number;
  trigger?: string;
  signals?: Record<string, unknown>;
}): Promise<AdaptivePlanReviewResult> {
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
    const rawParsed = parsePlanJson(content);
    if (!rawParsed) {
      throw new Error('Planner review returned invalid JSON.');
    }
    const parsed = adaptivePlanReviewResultSchema.partial().parse(rawParsed);
    const shouldReplan = Boolean(parsed.shouldReplan);
    const meta = normalizePlannerMeta(rawParsed);
    const hierarchy = normalizePlanHierarchy(rawParsed);
    const hierarchySteps = hierarchy ? flattenPlanHierarchy(hierarchy) : [];
    const stepSpecs = hierarchySteps.length > 0 ? hierarchySteps : ((rawParsed as Record<string, unknown>).steps ?? []);
    const normalizedStepSpecs = normalizePlanStepSpecs(stepSpecs as unknown[]);
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
      const result: AdaptivePlanReviewResult = { shouldReplan: false, steps: [] };
      if (typeof parsed.reason === 'string') {
        result.reason = parsed.reason;
      }
      return result;
    }
    const result: AdaptivePlanReviewResult = {
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
    void ErrorSystem.logWarning('[chatbot][agent][engine] Planner review fallback', {
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
    const rawParsed = parsePlanJson(content);
    if (!rawParsed) {
      throw new Error('Self-check returned invalid JSON.');
    }
    const parsed = selfCheckReviewResultSchema.partial().parse(rawParsed);
    const action =
      parsed.action === 'replan' || parsed.action === 'wait_human' ? parsed.action : 'continue';
    const meta = normalizePlannerMeta(rawParsed);
    const hierarchy = normalizePlanHierarchy(rawParsed);
    const hierarchySteps = hierarchy ? flattenPlanHierarchy(hierarchy) : [];
    const stepSpecs = hierarchySteps.length > 0 ? hierarchySteps : ((rawParsed as Record<string, unknown>).steps ?? []);
    const normalizedStepSpecs = normalizePlanStepSpecs(stepSpecs as unknown[]);
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
    const result: SelfCheckReviewResult = {
      action,
      questions: normalizeStringList(parsed.questions),
      evidence: normalizeStringList(parsed.evidence),
      ...(typeof parsed.confidence === 'number' && {
        confidence: Math.round(parsed.confidence),
      }),
      missingInfo: normalizeStringList(parsed.missingInfo),
      blockers: normalizeStringList(parsed.blockers),
      hypotheses: normalizeStringList(parsed.hypotheses),
      verificationSteps: normalizeStringList(parsed.verificationSteps),
      toolSwitch: typeof parsed.toolSwitch === 'string' ? parsed.toolSwitch : undefined,
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
    void ErrorSystem.logWarning('[chatbot][agent][engine] Self-check fallback', {
      ...(runId && { runId }),
      error,
    });
    return { action: 'continue', steps: [] };
  }
}
