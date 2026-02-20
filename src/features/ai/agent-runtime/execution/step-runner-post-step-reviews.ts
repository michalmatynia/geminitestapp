import { logAgentAudit } from '@/features/ai/agent-runtime/audit';
import { getBrowserContextSummary } from '@/features/ai/agent-runtime/browsing/context';
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
import type {
  AgentExecutionContext,
  PlanStep,
  PlannerMeta,
} from '@/shared/contracts/agent-runtime/agent';
import prisma from '@/shared/lib/db/prisma';

import {
  persistCheckpoint,
} from '../memory/checkpoint';

type PostStepReviewInput = {
  context: AgentExecutionContext;
  step: PlanStep;
  stepIndex: number;
  previousUrl: string | null;
  lastContextUrl: string | null;
  planSteps: PlanStep[];
  taskType: PlannerMeta['taskType'] | null;
  memoryContext: string[];
  summaryCheckpoint: number;
  replanCount: number;
  selfCheckCount: number;
  stagnationCount: number;
  noContextCount: number;
  lastExtractionCheckAt: number;
  lastError: string | null;
  approvalRequestedStepId: string | null;
  approvalGrantedStepId: string | null;
  logBranchAlternatives: (
    meta: PlannerMeta | null | undefined,
    reason: string
  ) => Promise<void>;
};

type PostStepReviewResult = {
  planSteps: PlanStep[];
  taskType: PlannerMeta['taskType'] | null;
  memoryContext: string[];
  summaryCheckpoint: number;
  replanCount: number;
  selfCheckCount: number;
  stagnationCount: number;
  noContextCount: number;
  lastExtractionCheckAt: number;
  lastError: string | null;
  requiresHuman: boolean;
  shouldBreak: boolean;
};

export async function runPostStepAdaptiveReviews(
  input: PostStepReviewInput
): Promise<PostStepReviewResult> {
  const {
    context,
    step,
    stepIndex,
    previousUrl,
    approvalRequestedStepId,
    approvalGrantedStepId,
    logBranchAlternatives,
  } = input;
  let {
    lastContextUrl,
    planSteps,
    taskType,
    memoryContext,
    summaryCheckpoint,
    replanCount,
    selfCheckCount,
    stagnationCount,
    noContextCount,
    lastExtractionCheckAt,
    lastError,
  } = input;
  const {
    run,
    settings,
    preferences,
    memoryKey,
    memoryValidationModel,
    memorySummarizationModel,
    plannerModel,
    selfCheckModel,
    loopGuardModel,
    resolvedModel,
  } = context;
  const summaryInterval = 5;
  const midRunInterval = 3;

  const completedCount = planSteps.filter(
    (item: PlanStep) => item.status === 'completed'
  ).length;
  if (
    stagnationCount >= 2 &&
      replanCount < settings.maxReplanCalls &&
      completedCount > 0
  ) {
    const stagnationContext = await getBrowserContextSummary(run.id);
    const stagnationReview = await buildAdaptivePlanReview({
      prompt: run.prompt,
      memory: memoryContext,
      model: plannerModel,
      browserContext: stagnationContext,
      currentPlan: planSteps,
      completedIndex: stepIndex,
      runId: run.id,
      maxSteps: settings.maxSteps,
      maxStepAttempts: settings.maxStepAttempts,
      trigger: 'stagnation',
      signals: {
        stagnationCount,
        lastContextUrl,
      },
    });
    if (stagnationReview.shouldReplan && stagnationReview.steps.length > 0) {
      const nextIndex = stepIndex + 1;
      const remainingSlots = Math.max(1, settings.maxSteps - nextIndex);
      const nextSteps = stagnationReview.steps.slice(0, remainingSlots);
      planSteps = [...planSteps.slice(0, nextIndex), ...nextSteps];
      taskType = stagnationReview.meta?.taskType ?? taskType;
      replanCount += 1;
      stagnationCount = 0;
      await logAgentAudit(run.id, 'warning', 'Plan re-evaluated.', {
        type: 'plan-replan',
        steps: planSteps,
        reason: 'stagnation',
        plannerMeta: stagnationReview.meta ?? null,
        hierarchy: stagnationReview.hierarchy ?? null,
        stepId: step.id,
        activeStepId: step.id,
      });
      await logBranchAlternatives(stagnationReview.meta, 'stagnation');
      await persistCheckpoint({
        runId: run.id,
        steps: planSteps,
        activeStepId: planSteps[nextIndex]?.id ?? null,
        lastError,
        taskType,
        approvalRequestedStepId,
        approvalGrantedStepId,
        summaryCheckpoint,
        settings,
        preferences,
      });
    }
  }
  if (
    taskType === 'extract_info' &&
      completedCount >= 2 &&
      completedCount !== lastExtractionCheckAt &&
      replanCount < settings.maxReplanCalls &&
      'agentAuditLog' in prisma
  ) {
    lastExtractionCheckAt = completedCount;
    const extractionAudit = await prisma.agentAuditLog.findFirst({
      where: {
        runId: run.id,
        message: {
          in: ['Extracted product names.', 'Extracted emails.'],
        },
      },
      select: { id: true },
    });
    if (!extractionAudit) {
      const extractionContext = await getBrowserContextSummary(run.id);
      const extractionReview = await buildAdaptivePlanReview({
        prompt: run.prompt,
        memory: memoryContext,
        model: plannerModel,
        browserContext: extractionContext,
        currentPlan: planSteps,
        completedIndex: stepIndex,
        runId: run.id,
        maxSteps: settings.maxSteps,
        maxStepAttempts: settings.maxStepAttempts,
        trigger: 'missing-extraction',
        signals: {
          completedCount,
          lastContextUrl,
        },
      });
      if (extractionReview.shouldReplan && extractionReview.steps.length > 0) {
        const nextIndex = stepIndex + 1;
        const remainingSlots = Math.max(1, settings.maxSteps - nextIndex);
        const nextSteps = extractionReview.steps.slice(0, remainingSlots);
        planSteps = [...planSteps.slice(0, nextIndex), ...nextSteps];
        taskType = extractionReview.meta?.taskType ?? taskType;
        replanCount += 1;
        await logAgentAudit(run.id, 'warning', 'Plan re-evaluated.', {
          type: 'plan-replan',
          steps: planSteps,
          reason: 'missing-extraction',
          plannerMeta: extractionReview.meta ?? null,
          hierarchy: extractionReview.hierarchy ?? null,
          stepId: step.id,
          activeStepId: step.id,
        });
        await logBranchAlternatives(
          extractionReview.meta,
          'missing-extraction'
        );
        await persistCheckpoint({
          runId: run.id,
          steps: planSteps,
          activeStepId: planSteps[nextIndex]?.id ?? null,
          lastError,
          taskType,
          approvalRequestedStepId,
          approvalGrantedStepId,
          summaryCheckpoint,
          settings,
          preferences,
        });
      }
    }
  }
  if (
    completedCount >= summaryInterval &&
      completedCount % summaryInterval === 0 &&
      completedCount !== summaryCheckpoint
  ) {
    const summaryContext = await getBrowserContextSummary(run.id);
    const summary = await summarizePlannerMemoryWithLLM({
      prompt: run.prompt,
      model: memorySummarizationModel,
      memory: memoryContext,
      steps: planSteps,
      browserContext: summaryContext,
      runId: run.id,
    });
    if (summary) {
      await addAgentMemory({
        runId: run.id,
        scope: 'session',
        content: summary,
        metadata: { type: 'planner-summary', completedCount },
      });
      memoryContext = [...memoryContext, summary].slice(-10);
      summaryCheckpoint = completedCount;
      await logAgentAudit(run.id, 'info', 'Planner summary saved.', {
        type: 'planner-summary',
        completedCount,
        summary,
      });
      await persistCheckpoint({
        runId: run.id,
        steps: planSteps,
        activeStepId: planSteps[stepIndex + 1]?.id ?? null,
        lastError,
        taskType,
        approvalRequestedStepId,
        approvalGrantedStepId,
        summaryCheckpoint,
        settings,
        preferences,
      });
    }
  }
  if (
    noContextCount >= 2 &&
      replanCount < settings.maxReplanCalls &&
      completedCount > 0
  ) {
    const noContextReview = await buildAdaptivePlanReview({
      prompt: run.prompt,
      memory: memoryContext,
      model: plannerModel,
      browserContext: await getBrowserContextSummary(run.id),
      currentPlan: planSteps,
      completedIndex: stepIndex,
      runId: run.id,
      maxSteps: settings.maxSteps,
      maxStepAttempts: settings.maxStepAttempts,
      trigger: 'no-browser-context',
      signals: {
        noContextCount,
        lastContextUrl,
      },
    });
    if (noContextReview.shouldReplan && noContextReview.steps.length > 0) {
      const nextIndex = stepIndex + 1;
      const remainingSlots = Math.max(1, settings.maxSteps - nextIndex);
      const nextSteps = noContextReview.steps.slice(0, remainingSlots);
      planSteps = [...planSteps.slice(0, nextIndex), ...nextSteps];
      taskType = noContextReview.meta?.taskType ?? taskType;
      replanCount += 1;
      noContextCount = 0;
      await logAgentAudit(run.id, 'warning', 'Plan re-evaluated.', {
        type: 'plan-replan',
        steps: planSteps,
        reason: 'no-browser-context',
        plannerMeta: noContextReview.meta ?? null,
        hierarchy: noContextReview.hierarchy ?? null,
        stepId: step.id,
        activeStepId: step.id,
      });
      await logBranchAlternatives(noContextReview.meta, 'no-browser-context');
      await persistCheckpoint({
        runId: run.id,
        steps: planSteps,
        activeStepId: planSteps[nextIndex]?.id ?? null,
        lastError,
        taskType,
        approvalRequestedStepId,
        approvalGrantedStepId,
        summaryCheckpoint,
        settings,
        preferences,
      });
    }
  }
  if (
    completedCount >= midRunInterval &&
      completedCount % midRunInterval === 0 &&
      replanCount < settings.maxReplanCalls
  ) {
    const adaptContext = await getBrowserContextSummary(run.id);
    const adaptResult = await buildMidRunAdaptationWithLLM({
      prompt: run.prompt,
      model: plannerModel,
      memory: memoryContext,
      steps: planSteps,
      browserContext: adaptContext,
      runId: run.id,
      maxSteps: settings.maxSteps,
      maxStepAttempts: settings.maxStepAttempts,
    });
    if (adaptResult.shouldAdapt && adaptResult.steps.length > 0) {
      const nextIndex = stepIndex + 1;
      const remainingSlots = Math.max(1, settings.maxSteps - nextIndex);
      const guardedSteps = await guardRepetitionWithLLM({
        prompt: run.prompt,
        model: loopGuardModel,
        memory: memoryContext,
        currentPlan: planSteps,
        candidateSteps: adaptResult.steps,
        runId: run.id,
        maxSteps: remainingSlots,
      });
      const nextSteps = guardedSteps.slice(0, remainingSlots);
      planSteps = [...planSteps.slice(0, nextIndex), ...nextSteps];
      taskType = adaptResult.meta?.taskType ?? taskType;
      replanCount += 1;
      await logAgentAudit(run.id, 'warning', 'Plan adapted mid-run.', {
        type: 'plan-adapt',
        steps: planSteps,
        reason: adaptResult.reason,
        plannerMeta: adaptResult.meta ?? null,
        hierarchy: adaptResult.hierarchy ?? null,
        stepId: step.id,
        activeStepId: step.id,
      });
      await logBranchAlternatives(adaptResult.meta, 'mid-run-adapt');
      await persistCheckpoint({
        runId: run.id,
        steps: planSteps,
        activeStepId: planSteps[nextIndex]?.id ?? null,
        lastError,
        taskType,
        approvalRequestedStepId,
        approvalGrantedStepId,
        summaryCheckpoint,
        settings,
        preferences,
      });
    }
  }
  if (selfCheckCount < settings.maxSelfChecks) {
    const selfCheckContext = await getBrowserContextSummary(run.id);
    const selfCheck = await buildSelfCheckReview({
      prompt: run.prompt,
      memory: memoryContext,
      model: selfCheckModel,
      browserContext: selfCheckContext,
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
      runId: run.id,
      maxSteps: settings.maxSteps,
      maxStepAttempts: settings.maxStepAttempts,
    });
    selfCheckCount += 1;
    await logAgentAudit(run.id, 'info', 'Self-check completed.', {
      type: 'self-check',
      stepId: step.id,
      stepTitle: step.title,
      action: selfCheck.action,
      reason: selfCheck.reason,
      notes: selfCheck.notes,
      questions: selfCheck.questions,
      evidence: selfCheck.evidence,
      confidence: selfCheck.confidence,
      missingInfo: selfCheck.missingInfo,
      blockers: selfCheck.blockers,
      hypotheses: selfCheck.hypotheses,
      verificationSteps: selfCheck.verificationSteps,
      toolSwitch: selfCheck.toolSwitch,
      abortSignals: selfCheck.abortSignals,
      finishSignals: selfCheck.finishSignals,
    });
    if (selfCheck.action === 'wait_human') {
      lastError = selfCheck.reason ?? 'Self-check requested human input.';
      return {
        planSteps,
        taskType,
        memoryContext,
        summaryCheckpoint,
        replanCount,
        selfCheckCount,
        stagnationCount,
        noContextCount,
        lastExtractionCheckAt,
        lastError,
        requiresHuman: true,
        shouldBreak: true,
      };
    }
    if (selfCheck.action === 'replan' && selfCheck.steps.length > 0) {
      const nextIndex = stepIndex + 1;
      const remainingSlots = Math.max(1, settings.maxSteps - nextIndex);
      const guardedSteps = await guardRepetitionWithLLM({
        prompt: run.prompt,
        model: loopGuardModel,
        memory: memoryContext,
        currentPlan: planSteps,
        candidateSteps: selfCheck.steps,
        runId: run.id,
        maxSteps: remainingSlots,
      });
      const nextSteps = guardedSteps.slice(0, remainingSlots);
      planSteps = [...planSteps.slice(0, nextIndex), ...nextSteps];
      taskType = selfCheck.meta?.taskType ?? taskType;
      await logAgentAudit(run.id, 'warning', 'Plan replaced by self-check.', {
        type: 'self-check-replan',
        steps: planSteps,
        reason: selfCheck.reason,
        plannerMeta: selfCheck.meta ?? null,
        hierarchy: selfCheck.hierarchy ?? null,
        stepId: step.id,
        activeStepId: step.id,
      });
      await logBranchAlternatives(selfCheck.meta, 'self-check');
      await persistCheckpoint({
        runId: run.id,
        steps: planSteps,
        activeStepId: planSteps[nextIndex]?.id ?? null,
        lastError,
        taskType,
        approvalRequestedStepId,
        approvalGrantedStepId,
        summaryCheckpoint,
        settings,
        preferences,
      });
    }
  }
  if (
    previousUrl &&
      lastContextUrl &&
      lastContextUrl !== previousUrl &&
      replanCount < settings.maxReplanCalls
  ) {
    const shiftContext = await getBrowserContextSummary(run.id);
    const shiftReview = await buildAdaptivePlanReview({
      prompt: run.prompt,
      memory: memoryContext,
      model: plannerModel,
      browserContext: shiftContext,
      currentPlan: planSteps,
      completedIndex: stepIndex,
      runId: run.id,
      maxSteps: settings.maxSteps,
      maxStepAttempts: settings.maxStepAttempts,
      trigger: 'context-shift',
      signals: {
        previousUrl,
        lastContextUrl,
      },
    });
    if (shiftReview.shouldReplan && shiftReview.steps.length > 0) {
      const nextIndex = stepIndex + 1;
      const remainingSlots = Math.max(1, settings.maxSteps - nextIndex);
      const nextSteps = shiftReview.steps.slice(0, remainingSlots);
      planSteps = [...planSteps.slice(0, nextIndex), ...nextSteps];
      taskType = shiftReview.meta?.taskType ?? taskType;
      replanCount += 1;
      await logAgentAudit(run.id, 'warning', 'Plan re-evaluated.', {
        type: 'plan-replan',
        steps: planSteps,
        reason: 'context-shift',
        plannerMeta: shiftReview.meta ?? null,
        hierarchy: shiftReview.hierarchy ?? null,
        stepId: step.id,
        activeStepId: step.id,
      });
      await logBranchAlternatives(shiftReview.meta, 'context-shift');
      if (memoryKey) {
        await addProblemSolutionMemory({
          memoryKey,
          runId: run.id,
          problem: 'Context shifted (URL changed).',
          countermeasure: 'Replanned after context shift.',
          context: {
            stepId: step.id,
            stepTitle: step.title,
            reason: 'context-shift',
          },
          tags: ['context-shift'],
          model: memoryValidationModel ?? resolvedModel,
          summaryModel: memorySummarizationModel ?? resolvedModel,
          prompt: run.prompt,
        });
      }
      await persistCheckpoint({
        runId: run.id,
        steps: planSteps,
        activeStepId: planSteps[nextIndex]?.id ?? null,
        lastError,
        taskType,
        approvalRequestedStepId,
        approvalGrantedStepId,
        summaryCheckpoint,
        settings,
        preferences,
      });
    }
  }
  if (
    shouldEvaluateReplan(stepIndex, planSteps, settings.replanEverySteps) &&
      replanCount < settings.maxReplanCalls
  ) {
    const reviewContext = await getBrowserContextSummary(run.id);
    const reviewResult = await buildAdaptivePlanReview({
      prompt: run.prompt,
      memory: memoryContext,
      model: plannerModel,
      browserContext: reviewContext,
      currentPlan: planSteps,
      completedIndex: stepIndex,
      runId: run.id,
      maxSteps: settings.maxSteps,
      maxStepAttempts: settings.maxStepAttempts,
      trigger: 'scheduled-replan',
      signals: {
        completedCount,
        replanEverySteps: settings.replanEverySteps,
      },
    });
    if (reviewResult.shouldReplan && reviewResult.steps.length > 0) {
      const nextIndex = stepIndex + 1;
      const remainingSlots = Math.max(1, settings.maxSteps - nextIndex);
      const guardedSteps = await guardRepetitionWithLLM({
        prompt: run.prompt,
        model: loopGuardModel,
        memory: memoryContext,
        currentPlan: planSteps,
        candidateSteps: reviewResult.steps,
        runId: run.id,
        maxSteps: remainingSlots,
      });
      const nextSteps = guardedSteps.slice(0, remainingSlots);
      planSteps = [...planSteps.slice(0, nextIndex), ...nextSteps];
      taskType = reviewResult.meta?.taskType ?? taskType;
      replanCount += 1;
      await logAgentAudit(run.id, 'warning', 'Plan re-evaluated.', {
        type: 'plan-replan',
        steps: planSteps,
        reason: reviewResult.reason,
        plannerMeta: reviewResult.meta ?? null,
        hierarchy: reviewResult.hierarchy ?? null,
        stepId: step.id,
        activeStepId: step.id,
      });
      await logBranchAlternatives(reviewResult.meta, 'scheduled-replan');
      await persistCheckpoint({
        runId: run.id,
        steps: planSteps,
        activeStepId: planSteps[nextIndex]?.id ?? null,
        lastError,
        taskType,
        approvalRequestedStepId,
        approvalGrantedStepId,
        summaryCheckpoint,
        settings,
        preferences,
      });
    }
  }

  return {
    planSteps,
    taskType,
    memoryContext,
    summaryCheckpoint,
    replanCount,
    selfCheckCount,
    stagnationCount,
    noContextCount,
    lastExtractionCheckAt,
    lastError,
    requiresHuman: false,
    shouldBreak: false,
  };
}
