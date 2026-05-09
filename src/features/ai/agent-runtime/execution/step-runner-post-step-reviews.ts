import { logAgentAudit } from '@/features/ai/agent-runtime/audit';
import { getBrowserContextSummary } from '@/features/ai/agent-runtime/browsing/context';
import { applyAgentRuntimeContextMemory } from '@/features/ai/agent-runtime/context-registry/shared';
import { addAgentMemory } from '@/features/ai/agent-runtime/memory';
import { addProblemSolutionMemory } from '@/features/ai/agent-runtime/memory/context';
import {
  buildAdaptivePlanReview,
  buildMidRunAdaptationWithLLM,
  buildSelfCheckReview,
  guardRepetitionWithLLM,
  summarizePlannerMemoryWithLLM,
} from '@/features/ai/agent-runtime/planning/llm';
import { shouldEvaluateReplan } from '@/features/ai/agent-runtime/planning/utils';
import { getAgentAuditLogDelegate } from '@/features/ai/agent-runtime/store-delegates';
import type {
  AgentExecutionContext, PlanStep, PlannerMeta,
} from '@/shared/contracts/agent-runtime';
import { persistCheckpoint } from '../memory/checkpoint';

type PostStepReviewInput = {
  context: AgentExecutionContext; step: PlanStep; stepIndex: number; previousUrl: string | null;
  lastContextUrl: string | null; planSteps: PlanStep[]; taskType: PlannerMeta['taskType'] | null;
  memoryContext: string[]; summaryCheckpoint: number; replanCount: number; selfCheckCount: number;
  stagnationCount: number; noContextCount: number; lastExtractionCheckAt: number; lastError: string | null;
  approvalRequestedStepId: string | null; approvalGrantedStepId: string | null;
  logBranchAlternatives: (meta: PlannerMeta | null | undefined, reason: string) => Promise<void>;
};

type PostStepReviewResult = {
  planSteps: PlanStep[]; taskType: PlannerMeta['taskType'] | null; memoryContext: string[];
  summaryCheckpoint: number; replanCount: number; selfCheckCount: number; stagnationCount: number;
  noContextCount: number; lastExtractionCheckAt: number; lastError: string | null;
  requiresHuman: boolean; shouldBreak: boolean;
};

type ReviewState = {
  planSteps: PlanStep[]; taskType: PlannerMeta['taskType'] | null; memoryContext: string[];
  summaryCheckpoint: number; replanCount: number; selfCheckCount: number; stagnationCount: number;
  noContextCount: number; lastExtractionCheckAt: number; lastError: string | null;
};

type ReviewContext = {
  context: AgentExecutionContext; step: PlanStep; stepIndex: number; previousUrl: string | null;
  lastContextUrl: string | null; approvalRequestedStepId: string | null; approvalGrantedStepId: string | null;
  logBranchAlternatives: (meta: PlannerMeta | null | undefined, reason: string) => Promise<void>;
  completedCount: number;
};

type ReplanArgs = { steps: PlanStep[]; meta: PlannerMeta | null | undefined; trigger: string; hierarchy: unknown };

async function applyReplan(context: ReviewContext, state: ReviewState, args: ReplanArgs): Promise<ReviewState> {
  const { steps, meta, trigger, hierarchy } = args;
  const { context: ac, step, stepIndex, approvalRequestedStepId, approvalGrantedStepId } = context;
  const nextIndex = stepIndex + 1;
  const nextSteps = steps.slice(0, Math.max(1, ac.settings.maxSteps - nextIndex));
  const planSteps = [...state.planSteps.slice(0, nextIndex), ...nextSteps];
  const taskType = meta?.taskType ?? state.taskType;
  await logAgentAudit(ac.run.id, 'warning', 'Plan re-evaluated.', {
    type: 'plan-replan', steps: planSteps, reason: trigger, plannerMeta: meta ?? null,
    hierarchy: hierarchy ?? null, stepId: step.id, activeStepId: step.id,
  });
  await context.logBranchAlternatives(meta, trigger);
  await persistCheckpoint({
    runId: ac.run.id, steps: planSteps, activeStepId: planSteps[nextIndex]?.id ?? null,
    lastError: state.lastError, taskType, approvalRequestedStepId, approvalGrantedStepId,
    summaryCheckpoint: state.summaryCheckpoint, settings: ac.settings, preferences: ac.preferences, contextRegistry: ac.contextRegistry,
  });
  return { ...state, replanCount: state.replanCount + 1, planSteps, taskType };
}

async function handleStagnationReview(context: ReviewContext, state: ReviewState): Promise<ReviewState> {
  const { context: ac, stepIndex, lastContextUrl } = context;
  if (state.stagnationCount < 2 || state.replanCount >= ac.settings.maxReplanCalls || context.completedCount === 0) return state;
  const review = await buildAdaptivePlanReview({
    prompt: ac.run.prompt, memory: state.memoryContext, model: ac.plannerModel,
    browserContext: await getBrowserContextSummary(ac.run.id), currentPlan: state.planSteps,
    completedIndex: stepIndex, runId: ac.run.id, maxSteps: ac.settings.maxSteps,
    maxStepAttempts: ac.settings.maxStepAttempts, trigger: 'stagnation',
    signals: { stagnationCount: state.stagnationCount, lastContextUrl },
  });
  if (!review.shouldReplan || review.steps.length === 0) return state;
  const newState = await applyReplan(context, state, { steps: review.steps, meta: review.meta, trigger: 'stagnation', hierarchy: review.hierarchy });
  return { ...newState, stagnationCount: 0 };
}

async function hasExtractionAudit(runId: string): Promise<boolean> {
  const log = getAgentAuditLogDelegate();
  if (!log) return true;
  const audit = await log.findFirst({
    where: { runId, message: { in: ['Extracted product names.', 'Extracted emails.'] } },
    select: { id: true },
  });
  return audit !== null;
}

async function handleMissingExtractionReview(context: ReviewContext, state: ReviewState): Promise<ReviewState> {
  const { context: ac, stepIndex, lastContextUrl, completedCount } = context;
  const hasProgress = completedCount >= 2 && completedCount !== state.lastExtractionCheckAt;
  if (state.taskType !== 'extract_info' || !hasProgress || state.replanCount >= ac.settings.maxReplanCalls || await hasExtractionAudit(ac.run.id)) {
    return { ...state, lastExtractionCheckAt: completedCount };
  }
  const review = await buildAdaptivePlanReview({
    prompt: ac.run.prompt, memory: state.memoryContext, model: ac.plannerModel,
    browserContext: await getBrowserContextSummary(ac.run.id), currentPlan: state.planSteps,
    completedIndex: stepIndex, runId: ac.run.id, maxSteps: ac.settings.maxSteps,
    maxStepAttempts: ac.settings.maxStepAttempts, trigger: 'missing-extraction',
    signals: { completedCount, lastContextUrl },
  });
  if (!review.shouldReplan || review.steps.length === 0) return { ...state, lastExtractionCheckAt: completedCount };
  const newState = await applyReplan(context, state, { steps: review.steps, meta: review.meta, trigger: 'missing-extraction', hierarchy: review.hierarchy });
  return { ...newState, lastExtractionCheckAt: completedCount };
}

async function savePlannerSummary(ac: AgentExecutionContext, summary: string, completedCount: number): Promise<void> {
  await addAgentMemory({ runId: ac.run.id, scope: 'session', content: summary, metadata: { type: 'planner-summary', completedCount } });
  await logAgentAudit(ac.run.id, 'info', 'Planner summary saved.', { type: 'planner-summary', completedCount, summary });
}

async function handleSummaryReview(context: ReviewContext, state: ReviewState): Promise<ReviewState> {
  const { context: ac, stepIndex, completedCount, approvalRequestedStepId, approvalGrantedStepId } = context;
  if (completedCount < 5 || completedCount % 5 !== 0 || completedCount === state.summaryCheckpoint) return state;
  const summary = await summarizePlannerMemoryWithLLM({
    prompt: ac.run.prompt, model: ac.memorySummarizationModel, memory: state.memoryContext,
    steps: state.planSteps, browserContext: await getBrowserContextSummary(ac.run.id), runId: ac.run.id,
  });
  if (summary === null || summary === '') return state;
  await savePlannerSummary(ac, summary, completedCount);
  const updatedMemory = applyAgentRuntimeContextMemory([...state.memoryContext, summary], ac.contextRegistryPrompt);
  await persistCheckpoint({
    runId: ac.run.id, steps: state.planSteps, activeStepId: state.planSteps[stepIndex + 1]?.id ?? null,
    lastError: state.lastError, taskType: state.taskType, approvalRequestedStepId, approvalGrantedStepId,
    summaryCheckpoint: completedCount, settings: ac.settings, preferences: ac.preferences, contextRegistry: ac.contextRegistry,
  });
  return { ...state, memoryContext: updatedMemory, summaryCheckpoint: completedCount };
}

async function handleNoContextReview(context: ReviewContext, state: ReviewState): Promise<ReviewState> {
  const { context: ac, stepIndex, lastContextUrl, completedCount } = context;
  if (state.noContextCount < 2 || state.replanCount >= ac.settings.maxReplanCalls || completedCount === 0) return state;
  const review = await buildAdaptivePlanReview({
    prompt: ac.run.prompt, memory: state.memoryContext, model: ac.plannerModel,
    browserContext: await getBrowserContextSummary(ac.run.id), currentPlan: state.planSteps,
    completedIndex: stepIndex, runId: ac.run.id, maxSteps: ac.settings.maxSteps,
    maxStepAttempts: ac.settings.maxStepAttempts, trigger: 'no-browser-context',
    signals: { noContextCount: state.noContextCount, lastContextUrl },
  });
  if (!review.shouldReplan || review.steps.length === 0) return state;
  return applyReplan(context, { ...state, noContextCount: 0 }, { steps: review.steps, meta: review.meta, trigger: 'no-browser-context', hierarchy: review.hierarchy });
}

async function handleMidRunAdaptationReview(context: ReviewContext, state: ReviewState): Promise<ReviewState> {
  const { context: ac, stepIndex, completedCount } = context;
  if (completedCount < 3 || completedCount % 3 !== 0 || state.replanCount >= ac.settings.maxReplanCalls) return state;
  const adapt = await buildMidRunAdaptationWithLLM({
    prompt: ac.run.prompt, model: ac.plannerModel, memory: state.memoryContext,
    steps: state.planSteps, browserContext: await getBrowserContextSummary(ac.run.id),
    runId: ac.run.id, maxSteps: ac.settings.maxSteps, maxStepAttempts: ac.settings.maxStepAttempts,
  });
  if (!adapt.shouldAdapt || adapt.steps.length === 0) return state;
  const guarded = await guardRepetitionWithLLM({
    prompt: ac.run.prompt, model: ac.loopGuardModel, memory: state.memoryContext,
    currentPlan: state.planSteps, candidateSteps: adapt.steps, runId: ac.run.id, maxSteps: Math.max(1, ac.settings.maxSteps - (stepIndex + 1)),
  });
  return applyReplan(context, state, { steps: guarded, meta: adapt.meta, trigger: 'mid-run-adapt', hierarchy: adapt.hierarchy });
}

async function handleSelfCheckReview(context: ReviewContext, state: ReviewState): Promise<ReviewState & { requiresHuman: boolean; shouldBreak: boolean }> {
  const { context: ac, step, stepIndex, previousUrl, lastContextUrl, completedCount } = context;
  if (state.selfCheckCount >= ac.settings.maxSelfChecks) return { ...state, requiresHuman: false, shouldBreak: false };
  const check = await buildSelfCheckReview({
    prompt: ac.run.prompt, memory: state.memoryContext, model: ac.selfCheckModel,
    browserContext: await getBrowserContextSummary(ac.run.id), step, stepIndex,
    lastError: state.lastError, taskType: state.taskType, completedCount,
    previousUrl, lastContextUrl, stagnationCount: state.stagnationCount,
    noContextCount: state.noContextCount, replanCount: state.replanCount,
    runId: ac.run.id, maxSteps: ac.settings.maxSteps, maxStepAttempts: ac.settings.maxStepAttempts,
  });
  await logAgentAudit(ac.run.id, 'info', 'Self-check completed.', {
    type: 'self-check', stepId: step.id, stepTitle: step.title, action: check.action,
    reason: check.reason, confidence: check.confidence, toolSwitch: check.toolSwitch,
  });
  if (check.action === 'wait_human') return { ...state, selfCheckCount: state.selfCheckCount + 1, lastError: check.reason ?? 'Human input requested.', requiresHuman: true, shouldBreak: true };
  if (check.action === 'replan' && check.steps.length > 0) {
    const guarded = await guardRepetitionWithLLM({
      prompt: ac.run.prompt, model: ac.loopGuardModel, memory: state.memoryContext,
      currentPlan: state.planSteps, candidateSteps: check.steps, runId: ac.run.id, maxSteps: Math.max(1, ac.settings.maxSteps - (stepIndex + 1)),
    });
    return { ...await applyReplan(context, { ...state, selfCheckCount: state.selfCheckCount + 1 }, { steps: guarded, meta: check.meta, trigger: 'self-check', hierarchy: check.hierarchy }), requiresHuman: false, shouldBreak: false };
  }
  return { ...state, selfCheckCount: state.selfCheckCount + 1, requiresHuman: false, shouldBreak: false };
}

async function logContextShift(context: ReviewContext, ac: AgentExecutionContext): Promise<void> {
  if (ac.memoryKey === null || ac.memoryKey === '') return;
  await addProblemSolutionMemory({
    memoryKey: ac.memoryKey, runId: ac.run.id, problem: 'Context shifted (URL changed).',
    countermeasure: 'Replanned after context shift.',
    context: { stepId: context.step.id, stepTitle: context.step.title, reason: 'context-shift' },
    tags: ['context-shift'], model: ac.memoryValidationModel ?? ac.resolvedModel,
    summaryModel: ac.memorySummarizationModel, prompt: ac.run.prompt,
  });
}

async function handleContextShiftReview(context: ReviewContext, state: ReviewState): Promise<ReviewState> {
  const { context: ac, stepIndex, previousUrl, lastContextUrl } = context;
  if (previousUrl === null || lastContextUrl === null || lastContextUrl === previousUrl || state.replanCount >= ac.settings.maxReplanCalls) return state;
  const review = await buildAdaptivePlanReview({
    prompt: ac.run.prompt, memory: state.memoryContext, model: ac.plannerModel,
    browserContext: await getBrowserContextSummary(ac.run.id), currentPlan: state.planSteps,
    completedIndex: stepIndex, runId: ac.run.id, maxSteps: ac.settings.maxSteps,
    maxStepAttempts: ac.settings.maxStepAttempts, trigger: 'context-shift',
    signals: { previousUrl, lastContextUrl },
  });
  if (!review.shouldReplan || review.steps.length === 0) return state;
  await logContextShift(context, ac);
  return applyReplan(context, state, { steps: review.steps, meta: review.meta, trigger: 'context-shift', hierarchy: review.hierarchy });
}

async function handleScheduledReplanReview(context: ReviewContext, state: ReviewState): Promise<ReviewState> {
  const { context: ac, stepIndex, completedCount } = context;
  if (!shouldEvaluateReplan(stepIndex, state.planSteps, ac.settings.replanEverySteps) || state.replanCount >= ac.settings.maxReplanCalls) return state;
  const review = await buildAdaptivePlanReview({
    prompt: ac.run.prompt, memory: state.memoryContext, model: ac.plannerModel,
    browserContext: await getBrowserContextSummary(ac.run.id), currentPlan: state.planSteps,
    completedIndex: stepIndex, runId: ac.run.id, maxSteps: ac.settings.maxSteps,
    maxStepAttempts: ac.settings.maxStepAttempts, trigger: 'scheduled-replan',
    signals: { completedCount, replanEverySteps: ac.settings.replanEverySteps },
  });
  if (!review.shouldReplan || review.steps.length === 0) return state;
  const guarded = await guardRepetitionWithLLM({
    prompt: ac.run.prompt, model: ac.loopGuardModel, memory: state.memoryContext,
    currentPlan: state.planSteps, candidateSteps: review.steps, runId: ac.run.id, maxSteps: Math.max(1, ac.settings.maxSteps - (stepIndex + 1)),
  });
  return applyReplan(context, state, { steps: guarded, meta: review.meta, trigger: 'scheduled-replan', hierarchy: review.hierarchy });
}

export async function runPostStepAdaptiveReviews(input: PostStepReviewInput): Promise<PostStepReviewResult> {
  const { context, step, stepIndex, previousUrl, lastContextUrl, approvalRequestedStepId, approvalGrantedStepId, logBranchAlternatives } = input;
  const completedCount = input.planSteps.filter((item: PlanStep) => item.status === 'completed').length;
  const reviewContext: ReviewContext = { context, step, stepIndex, previousUrl, lastContextUrl, approvalRequestedStepId, approvalGrantedStepId, logBranchAlternatives, completedCount };
  let state: ReviewState = {
    planSteps: input.planSteps, taskType: input.taskType, memoryContext: input.memoryContext, summaryCheckpoint: input.summaryCheckpoint, replanCount: input.replanCount,
    selfCheckCount: input.selfCheckCount, stagnationCount: input.stagnationCount, noContextCount: input.noContextCount, lastExtractionCheckAt: input.lastExtractionCheckAt, lastError: input.lastError,
  };
  state = await handleStagnationReview(reviewContext, state);
  state = await handleMissingExtractionReview(reviewContext, state);
  state = await handleSummaryReview(reviewContext, state);
  state = await handleNoContextReview(reviewContext, state);
  state = await handleMidRunAdaptationReview(reviewContext, state);
  const scRes = await handleSelfCheckReview(reviewContext, state);
  if (scRes.shouldBreak) return { ...scRes, requiresHuman: scRes.requiresHuman, shouldBreak: scRes.shouldBreak };
  state = await handleContextShiftReview(reviewContext, scRes);
  state = await handleScheduledReplanReview(reviewContext, state);
  return { ...state, requiresHuman: false, shouldBreak: false };
}
