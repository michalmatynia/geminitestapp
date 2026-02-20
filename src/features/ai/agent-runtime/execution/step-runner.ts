import { logAgentAudit } from '@/features/ai/agent-runtime/audit';
import {
  evaluateApprovalGateWithLLM,
  requiresHumanApproval,
} from '@/features/ai/agent-runtime/audit/gate';
import { getBrowserContextSummary } from '@/features/ai/agent-runtime/browsing/context';
import { sleep } from '@/features/ai/agent-runtime/core/utils';
import {
  buildLoopGuardReview,
  detectLoopPattern,
} from '@/features/ai/agent-runtime/execution/loop-guard';
import { runPostStepAdaptiveReviews } from '@/features/ai/agent-runtime/execution/step-runner-post-step-reviews';
import { addAgentMemory } from '@/features/ai/agent-runtime/memory';
import {
  buildCheckpointState,
  persistCheckpoint,
} from '@/features/ai/agent-runtime/memory/checkpoint';
import { addProblemSolutionMemory } from '@/features/ai/agent-runtime/memory/context';
import {
  buildAdaptivePlanReview,
  buildCheckpointBriefWithLLM,
  buildPlanWithLLM,
  guardRepetitionWithLLM,
  summarizePlannerMemoryWithLLM,
} from '@/features/ai/agent-runtime/planning/llm';
import {
  appendTaskTypeToPrompt,
  buildBranchStepsFromAlternatives,
  isExtractionStep,
} from '@/features/ai/agent-runtime/planning/utils';
import { runAgentBrowserControl, runAgentTool } from '@/features/ai/agent-runtime/tools';
import type {
  AgentExecutionContext,
  PlanStep,
  PlannerMeta,
} from '@/shared/contracts/agent-runtime';
import prisma from '@/shared/lib/db/prisma';
import unknownToErrorMessage from '@/shared/utils/error-formatting';

import type { Browser, BrowserContext } from 'playwright';

type StepLoopInput = {
  context: AgentExecutionContext;
  sharedBrowser: Browser | null;
  sharedContext: BrowserContext | null;
  planSteps: PlanStep[];
  stepIndex: number;
  taskType: PlannerMeta['taskType'] | null;
  summaryCheckpoint: number;
  checkpoint?: {
    approvalRequestedStepId?: string | null;
    approvalGrantedStepId?: string | null;
    checkpointStepId?: string | null;
    lastError?: string | null;
  } | null;
};

type StepLoopResult = {
  planSteps: PlanStep[];
  stepIndex: number;
  taskType: PlannerMeta['taskType'] | null;
  memoryContext: string[];
  summaryCheckpoint: number;
  overallOk: boolean;
  lastError: string | null;
  requiresHuman: boolean;
};

export async function runPlanStepLoop(
  input: StepLoopInput
): Promise<StepLoopResult> {
  const {
    context,
    sharedBrowser,
    sharedContext,
  } = input;
  const {
    run,
    settings,
    preferences,
    memoryKey,
    memoryValidationModel,
    memorySummarizationModel,
    plannerModel,
    loopGuardModel,
    approvalGateModel,
    resolvedModel,
  } = context;
  let { planSteps, stepIndex, taskType, summaryCheckpoint } = input;
  let { memoryContext } = context;

  const summaryInterval = 5;
  let overallOk = true;
  let lastError: string | null = null;
  let requiresHuman = false;
  const branchedStepIds = new Set<string>();
  let replanCount = 0;
  let selfCheckCount = 0;
  let lastContextUrl = context.browserContext?.url ?? null;
  let hasBrowserContext = Boolean(
    lastContextUrl && lastContextUrl !== 'about:blank'
  );
  let consecutiveFailures = 0;
  let approvalRequestedStepId: string | null =
    input.checkpoint?.approvalRequestedStepId ?? null;
  const approvalGrantedStepId: string | null =
    input.checkpoint?.approvalGrantedStepId ?? null;
  let checkpointBriefStepId: string | null =
    input.checkpoint?.checkpointStepId ?? null;
  let checkpointBriefError: string | null = input.checkpoint?.lastError ?? null;
  let stagnationCount = 0;
  let noContextCount = 0;
  let lastStableUrl = lastContextUrl;
  let lastExtractionCheckAt = 0;
  let loopGuardCooldown = 0;
  let loopSignalStreak = 0;
  let loopBackoffMs = 0;
  const recentStepTrace: Array<{
    title: string;
    status: PlanStep['status'];
    tool?: string | null;
    url: string | null;
  }> = [];

  const maybeUpdateCheckpointBrief = async (
    activeStepIdForBrief: string | null
  ): Promise<void> => {
    if (!activeStepIdForBrief) return;
    if (
      checkpointBriefStepId === activeStepIdForBrief &&
      checkpointBriefError === (lastError ?? null)
    ) {
      return;
    }
    const briefContext = await getBrowserContextSummary(run.id);
    const brief = await buildCheckpointBriefWithLLM({
      prompt: run.prompt,
      model: memorySummarizationModel,
      memory: memoryContext,
      steps: planSteps,
      activeStepId: activeStepIdForBrief,
      lastError,
      browserContext: briefContext,
      runId: run.id,
    });
    if (!brief) return;
    checkpointBriefStepId = activeStepIdForBrief;
    checkpointBriefError = lastError ?? null;
    await persistCheckpoint({
      runId: run.id,
      steps: planSteps,
      activeStepId: activeStepIdForBrief,
      lastError,
      taskType,
      approvalRequestedStepId,
      approvalGrantedStepId,
      checkpointBrief: brief.summary,
      checkpointNextActions: brief.nextActions,
      checkpointRisks: brief.risks,
      checkpointStepId: checkpointBriefStepId,
      checkpointCreatedAt: new Date().toISOString(),
      summaryCheckpoint,
      settings,
      preferences,
    });
    await logAgentAudit(run.id, 'info', 'Checkpoint brief saved.', {
      type: 'checkpoint-brief',
      stepId: activeStepIdForBrief,
      summary: brief.summary,
    });
  };

  const logBranchAlternatives = async (
    meta: PlannerMeta | null | undefined,
    reason: string
  ): Promise<void> => {
    const branchAlternatives = buildBranchStepsFromAlternatives(
      meta?.alternatives ?? undefined,
      settings.maxStepAttempts,
      Math.min(6, settings.maxSteps)
    );
    if (branchAlternatives.length === 0) return;
    await logAgentAudit(run.id, 'info', 'Plan branch created.', {
      type: 'plan-branch',
      branchSteps: branchAlternatives,
      reason,
      plannerMeta: meta ?? null,
    });
  };

  while (stepIndex < planSteps.length) {
    const step = planSteps[stepIndex];
    if (!step) {
      stepIndex += 1;
      continue;
    }
    if (step.status === 'completed') {
      stepIndex += 1;
      continue;
    }
    let requiresApproval = false;
    let approvalReason: string | null = null;
    let approvalRisk: string | null = null;
    let approvalSource = 'heuristic';
    if (preferences.requireHumanApproval && approvalGrantedStepId !== step.id) {
      requiresApproval = requiresHumanApproval(step, run.prompt);
      if (!requiresApproval && approvalGateModel) {
        const gateContext = await getBrowserContextSummary(run.id);
        const gateDecision = await evaluateApprovalGateWithLLM({
          prompt: run.prompt,
          step,
          model: approvalGateModel,
          browserContext: gateContext,
          runId: run.id,
        });
        if (gateDecision) {
          requiresApproval = gateDecision.requiresApproval;
          approvalReason = gateDecision.reason ?? null;
          approvalRisk = gateDecision.riskLevel ?? null;
          approvalSource = 'policy-model';
          await logAgentAudit(run.id, 'info', 'Approval gate evaluated.', {
            type: 'approval-gate-review',
            stepId: step.id,
            stepTitle: step.title,
            requiresApproval,
            reason: approvalReason,
            riskLevel: approvalRisk,
            model: approvalGateModel,
          });
        }
      }
    }
    if (
      preferences.requireHumanApproval &&
      requiresApproval &&
      approvalGrantedStepId !== step.id
    ) {
      approvalRequestedStepId = step.id;
      await prisma.chatbotAgentRun.update({
        where: { id: run.id },
        data: {
          status: 'waiting_human',
          requiresHumanIntervention: true,
          activeStepId: step.id,
          planState: buildCheckpointState({
            steps: planSteps,
            activeStepId: step.id,
            lastError,
            taskType,
            approvalRequestedStepId,
            approvalGrantedStepId,
            summaryCheckpoint,
            settings,
            preferences,
          }),
          checkpointedAt: new Date(),
          logLines: {
            push: `[${new Date().toISOString()}] Approval required for step.`,
          },
        },
      });
      await logAgentAudit(run.id, 'warning', 'Approval required.', {
        type: 'approval-gate',
        stepId: step.id,
        stepTitle: step.title,
        source: approvalSource,
        reason: approvalReason,
        riskLevel: approvalRisk,
      });
      return {
        planSteps,
        stepIndex,
        taskType,
        memoryContext,
        summaryCheckpoint,
        overallOk,
        lastError,
        requiresHuman,
      };
    }
    const attempts = (step.attempts ?? 0) + 1;
    planSteps = planSteps.map((item: PlanStep) =>
      item.id === step.id ? { ...item, status: 'running', attempts } : item
    );
    await logAgentAudit(run.id, 'info', 'Plan updated.', {
      type: 'plan-update',
      steps: planSteps,
      activeStepId: step.id,
    });
    await persistCheckpoint({
      runId: run.id,
      steps: planSteps,
      activeStepId: step.id,
      lastError,
      taskType,
      approvalRequestedStepId,
      approvalGrantedStepId,
      summaryCheckpoint,
      settings,
      preferences,
    });

    if (step.tool === 'none') {
      planSteps = planSteps.map((item: PlanStep) =>
        item.id === step.id ? { ...item, status: 'completed' } : item
      );
      await logAgentAudit(run.id, 'info', 'Plan updated.', {
        type: 'plan-update',
        steps: planSteps,
        result: 'completed',
      });
      await maybeUpdateCheckpointBrief(step.id);
      const completedCount = planSteps.filter(
        (item: PlanStep) => item.status === 'completed'
      ).length;
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
            activeStepId: step.id,
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
      continue;
    }

    const shouldInitializeBrowser = !hasBrowserContext || stepIndex === 0;
    const previousUrl = lastContextUrl;
    const shouldRunExtraction = isExtractionStep(step, run.prompt, taskType);
    const toolPrompt = appendTaskTypeToPrompt(
      run.prompt,
      shouldRunExtraction ? 'extract_info' : taskType
    );
    const toolName =
      shouldInitializeBrowser || shouldRunExtraction ? 'playwright' : 'snapshot';
    const toolStart = Date.now();
    const toolContext = {
      type: 'tool-execution',
      toolName,
      stepId: step.id,
      stepTitle: step.title,
      shouldRunExtraction,
      shouldInitializeBrowser,
    };
    await logAgentAudit(run.id, 'info', 'Tool execution started.', toolContext);
    const toolTimeoutId = setTimeout(() => {
      void logAgentAudit(
        run.id,
        'warning',
        'Tool execution taking longer than expected.',
        {
          ...toolContext,
          elapsedMs: Date.now() - toolStart,
        }
      );
    }, 20000);
    let toolResult: Awaited<ReturnType<typeof runAgentTool>> | null = null;
    let toolError: unknown = null;
    try {
      toolResult =
        shouldInitializeBrowser || shouldRunExtraction
          ? await runAgentTool(
            {
              name: 'playwright',
              input: {
                prompt: toolPrompt,
                browser: run.agentBrowser || 'chromium',
                runId: run.id,
                ...(typeof run.runHeadless === 'boolean' && {
                  runHeadless: run.runHeadless,
                }),
                stepId: step.id,
                stepLabel: step.title,
              },
            },
            sharedBrowser ?? undefined,
            sharedContext ?? undefined
          )
          : await runAgentBrowserControl({
            runId: run.id,
            action: 'snapshot',
            stepId: step.id,
            stepLabel: step.title,
          });
    } catch (error) {
      toolError = error;
    } finally {
      clearTimeout(toolTimeoutId);
      const errorMessage = toolResult?.error ?? unknownToErrorMessage(toolError);
      await logAgentAudit(
        run.id,
        toolError ? 'error' : 'info',
        'Tool execution finished.',
        {
          ...toolContext,
          ok: toolResult?.ok ?? false,
          error: errorMessage,
          durationMs: Date.now() - toolStart,
        }
      );
    }
    if (toolError || !toolResult) {
      throw toolError instanceof Error
        ? toolError
        : new Error('Tool execution failed.');
    }

    if (!toolResult.ok) {
      overallOk = false;
      lastError = toolResult.error || 'Tool failed.';
      requiresHuman =
        typeof lastError === 'string' &&
        /requires human|cloudflare challenge/i.test(lastError);
      consecutiveFailures += 1;
    } else {
      consecutiveFailures = 0;
    }

    planSteps = planSteps.map((item: PlanStep) =>
      item.id === step.id
        ? {
          ...item,
          status: toolResult.ok ? 'completed' : 'failed',
          snapshotId: toolResult.output?.snapshotId ?? null,
          logCount: toolResult.output?.logCount ?? null,
        }
        : item
    );
    if (toolResult.output?.snapshotId) {
      const outputUrl =
        typeof toolResult.output?.url === 'string' ? toolResult.output.url : null;
      hasBrowserContext = Boolean(outputUrl && outputUrl !== 'about:blank');
      if (hasBrowserContext && outputUrl) {
        lastContextUrl = outputUrl;
        noContextCount = 0;
        if (lastStableUrl === outputUrl) {
          stagnationCount += 1;
        } else {
          stagnationCount = 0;
          lastStableUrl = outputUrl;
        }
      } else {
        noContextCount += 1;
      }
    }
    await logAgentAudit(run.id, 'info', 'Plan updated.', {
      type: 'plan-update',
      steps: planSteps,
      result: toolResult.ok ? 'completed' : 'failed',
    });
    await persistCheckpoint({
      runId: run.id,
      steps: planSteps,
      activeStepId: toolResult.ok
        ? (planSteps[stepIndex + 1]?.id ?? null)
        : step.id,
      lastError,
      taskType,
      approvalRequestedStepId,
      approvalGrantedStepId,
      summaryCheckpoint,
      settings,
      preferences,
    });
    await maybeUpdateCheckpointBrief(
      toolResult.ok ? (planSteps[stepIndex + 1]?.id ?? null) : step.id
    );

    loopGuardCooldown = Math.max(0, loopGuardCooldown - 1);
    recentStepTrace.push({
      title: step.title,
      status: toolResult.ok ? 'completed' : 'failed',
      tool: step.tool ?? null,
      url: lastContextUrl,
    });
    if (recentStepTrace.length > 6) {
      recentStepTrace.splice(0, recentStepTrace.length - 6);
    }
    const loopSignal = detectLoopPattern(recentStepTrace);
    if (loopSignal) {
      loopSignalStreak += 1;
    } else {
      loopSignalStreak = 0;
      loopBackoffMs = 0;
    }
    if (
      loopSignal &&
      loopSignalStreak >= settings.loopGuardThreshold &&
      loopGuardCooldown === 0 &&
      replanCount < settings.maxReplanCalls
    ) {
      const baseBackoff = Math.max(0, settings.loopBackoffBaseMs);
      const maxBackoff = Math.max(baseBackoff, settings.loopBackoffMaxMs);
      loopBackoffMs = loopBackoffMs
        ? Math.min(loopBackoffMs * 2, maxBackoff)
        : baseBackoff;
      if (loopBackoffMs > 0) {
        await sleep(loopBackoffMs);
      }
      const loopContext = await getBrowserContextSummary(run.id);
      const loopReview = await buildLoopGuardReview({
        prompt: run.prompt,
        memory: memoryContext,
        model: loopGuardModel,
        browserContext: loopContext,
        currentPlan: planSteps,
        completedIndex: stepIndex,
        loopSignal,
        lastError,
        runId: run.id,
        maxSteps: settings.maxSteps,
        maxStepAttempts: settings.maxStepAttempts,
      });
      loopGuardCooldown = 2;
      await logAgentAudit(run.id, 'warning', 'Loop guard evaluated.', {
        type: 'loop-guard',
        action: loopReview.action,
        reason: loopReview.reason,
        loop: loopSignal,
        backoffMs: loopBackoffMs,
        streak: loopSignalStreak,
      });
      if (loopReview.action === 'wait_human') {
        requiresHuman = true;
        lastError = loopReview.reason ?? 'Loop guard requested human input.';
        break;
      }
      if (loopReview.action === 'replan' && loopReview.steps.length > 0) {
        const nextIndex = stepIndex + 1;
        const remainingSlots = Math.max(1, settings.maxSteps - nextIndex);
        const guardedSteps = await guardRepetitionWithLLM({
          prompt: run.prompt,
          model: loopGuardModel,
          memory: memoryContext,
          currentPlan: planSteps,
          candidateSteps: loopReview.steps,
          runId: run.id,
          maxSteps: remainingSlots,
        });
        const nextSteps = guardedSteps.slice(0, remainingSlots);
        planSteps = [...planSteps.slice(0, nextIndex), ...nextSteps];
        taskType = loopReview.meta?.taskType ?? taskType;
        replanCount += 1;
        await logAgentAudit(run.id, 'warning', 'Plan re-evaluated.', {
          type: 'plan-replan',
          steps: planSteps,
          reason: loopReview.reason,
          plannerMeta: loopReview.meta ?? null,
          hierarchy: loopReview.hierarchy ?? null,
          stepId: step.id,
          activeStepId: step.id,
        });
        await logBranchAlternatives(loopReview.meta, 'loop-guard');
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
        stepIndex = nextIndex;
        overallOk = true;
        lastError = null;
        continue;
      }
    }

    if (toolResult.ok && replanCount < settings.maxReplanCalls) {
      const stepContext = await getBrowserContextSummary(run.id);
      const stepReview = await buildAdaptivePlanReview({
        prompt: run.prompt,
        memory: memoryContext,
        model: plannerModel,
        browserContext: stepContext,
        currentPlan: planSteps,
        completedIndex: stepIndex,
        runId: run.id,
        maxSteps: settings.maxSteps,
        maxStepAttempts: settings.maxStepAttempts,
        trigger: 'step-complete',
        signals: {
          stepId: step.id,
          stepTitle: step.title,
          stepStatus: 'completed',
          url: lastContextUrl,
        },
      });
      if (stepReview.shouldReplan && stepReview.steps.length > 0) {
        const nextIndex = stepIndex + 1;
        const remainingSlots = Math.max(1, settings.maxSteps - nextIndex);
        const guardedSteps = await guardRepetitionWithLLM({
          prompt: run.prompt,
          model: loopGuardModel,
          memory: memoryContext,
          currentPlan: planSteps,
          candidateSteps: stepReview.steps,
          runId: run.id,
          maxSteps: remainingSlots,
        });
        const nextSteps = guardedSteps.slice(0, remainingSlots);
        planSteps = [...planSteps.slice(0, nextIndex), ...nextSteps];
        taskType = stepReview.meta?.taskType ?? taskType;
        replanCount += 1;
        await logAgentAudit(run.id, 'warning', 'Plan re-evaluated.', {
          type: 'plan-replan',
          steps: planSteps,
          reason: stepReview.reason ?? 'step-complete',
          plannerMeta: stepReview.meta ?? null,
          hierarchy: stepReview.hierarchy ?? null,
          stepId: step.id,
          activeStepId: step.id,
        });
        await logBranchAlternatives(stepReview.meta, 'step-complete');
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
        stepIndex = nextIndex;
        overallOk = true;
        lastError = null;
        continue;
      }
    }

    if (!toolResult.ok) {
      if (attempts < (step.maxAttempts ?? settings.maxStepAttempts)) {
        if (branchedStepIds.has(step.id)) {
          break;
        }
        const replanBrowserContext = await getBrowserContextSummary(run.id);
        await logAgentAudit(run.id, 'warning', 'Planner context prepared.', {
          type: 'planner-context',
          reason: 'replan-after-failure',
          prompt: run.prompt,
          model: plannerModel,
          memory: memoryContext,
          browserContext: replanBrowserContext,
          lastError,
          previousPlan: planSteps.map((item: PlanStep) => ({
            id: item.id,
            title: item.title,
            status: item.status,
            tool: item.tool,
          })),
        });
        const branchResult = await buildPlanWithLLM({
          prompt: run.prompt,
          memory: memoryContext,
          model: plannerModel,
          guardModel: loopGuardModel,
          lastError,
          runId: run.id,
          browserContext: replanBrowserContext,
          mode: 'branch',
          failedStep: {
            id: step.id,
            title: step.title,
            expectedObservation: step.expectedObservation ?? null,
            successCriteria: step.successCriteria ?? null,
          },
          maxSteps: settings.maxSteps,
          maxStepAttempts: settings.maxStepAttempts,
        });
        if (branchResult.branchSteps?.length) {
          const failedIndex = planSteps.findIndex((item: PlanStep) => item.id === step.id);
          const insertAt =
            failedIndex === -1 ? planSteps.length : failedIndex + 1;
          planSteps = [
            ...planSteps.slice(0, insertAt),
            ...branchResult.branchSteps,
            ...planSteps.slice(insertAt),
          ];
          await logAgentAudit(run.id, 'warning', 'Plan branch created.', {
            type: 'plan-branch',
            failedStepId: step.id,
            branchSteps: branchResult.branchSteps,
            reason: 'step-failed',
            lastError,
            plannerMeta: branchResult.meta ?? null,
            stepId: step.id,
            activeStepId: step.id,
          });
          if (memoryKey && lastError) {
            await addProblemSolutionMemory({
              memoryKey,
              runId: run.id,
              problem: lastError,
              countermeasure: 'Created branch steps for failed step.',
              context: {
                stepId: step.id,
                stepTitle: step.title,
                reason: 'step-failed',
              },
              tags: ['branch'],
              model: memoryValidationModel ?? resolvedModel,
              summaryModel: memorySummarizationModel ?? resolvedModel,
              prompt: run.prompt,
            });
          }
          branchedStepIds.add(step.id);
          await logAgentAudit(run.id, 'info', 'Plan updated.', {
            type: 'plan-update',
            steps: planSteps,
            activeStepId: planSteps[insertAt]?.id ?? null,
          });
          await persistCheckpoint({
            runId: run.id,
            steps: planSteps,
            activeStepId: planSteps[insertAt]?.id ?? null,
            lastError,
            taskType,
            approvalRequestedStepId,
            approvalGrantedStepId,
            summaryCheckpoint,
            settings,
            preferences,
          });
          stepIndex = insertAt;
          overallOk = true;
          lastError = null;
          continue;
        }
        const replanResult = await buildPlanWithLLM({
          prompt: run.prompt,
          memory: memoryContext,
          model: plannerModel,
          guardModel: loopGuardModel,
          previousPlan: planSteps,
          lastError,
          runId: run.id,
          browserContext: replanBrowserContext,
          maxSteps: settings.maxSteps,
          maxStepAttempts: settings.maxStepAttempts,
        });
        if (replanResult.steps.length > 0) {
          planSteps = replanResult.steps;
          taskType = replanResult.meta?.taskType ?? taskType;
          await logAgentAudit(run.id, 'warning', 'Plan created.', {
            type: 'plan',
            steps: planSteps,
            source: replanResult.source,
            reason: 'replan-after-failure',
            hierarchy: replanResult.hierarchy ?? null,
            plannerMeta: replanResult.meta ?? null,
            stepId: step.id,
            activeStepId: step.id,
          });
          const branchAlternatives = buildBranchStepsFromAlternatives(
            replanResult.meta?.alternatives ?? undefined,
            settings.maxStepAttempts,
            Math.min(6, settings.maxSteps)
          );
          if (branchAlternatives.length > 0) {
            await logAgentAudit(run.id, 'info', 'Plan branch created.', {
              type: 'plan-branch',
              branchSteps: branchAlternatives,
              reason: 'replan-alternatives',
              plannerMeta: replanResult.meta ?? null,
            });
          }
          if (memoryKey && lastError) {
            await addProblemSolutionMemory({
              memoryKey,
              runId: run.id,
              problem: lastError,
              countermeasure: 'Replanned after failure.',
              context: {
                stepId: step.id,
                stepTitle: step.title,
                reason: 'replan-after-failure',
              },
              tags: ['replan'],
              model: memoryValidationModel ?? resolvedModel,
              summaryModel: memorySummarizationModel ?? resolvedModel,
              prompt: run.prompt,
            });
          }
          await persistCheckpoint({
            runId: run.id,
            steps: planSteps,
            activeStepId: planSteps[0]?.id ?? null,
            lastError,
            taskType,
            approvalRequestedStepId,
            approvalGrantedStepId,
            summaryCheckpoint,
            settings,
            preferences,
          });
          stepIndex = 0;
          overallOk = true;
          lastError = null;
          continue;
        }
      }
      if (consecutiveFailures >= 2 && replanCount < settings.maxReplanCalls) {
        const failureContext = await getBrowserContextSummary(run.id);
        const deadEndReview = await buildAdaptivePlanReview({
          prompt: run.prompt,
          memory: memoryContext,
          model: plannerModel,
          browserContext: failureContext,
          currentPlan: planSteps,
          completedIndex: stepIndex,
          runId: run.id,
          maxSteps: settings.maxSteps,
          maxStepAttempts: settings.maxStepAttempts,
          trigger: 'dead-end',
          signals: {
            consecutiveFailures,
            lastError,
            lastContextUrl,
          },
        });
        if (deadEndReview.shouldReplan && deadEndReview.steps.length > 0) {
          const nextIndex = stepIndex + 1;
          const remainingSlots = Math.max(1, settings.maxSteps - nextIndex);
          const nextSteps = deadEndReview.steps.slice(0, remainingSlots);
          planSteps = [...planSteps.slice(0, nextIndex), ...nextSteps];
          taskType = deadEndReview.meta?.taskType ?? taskType;
          replanCount += 1;
          await logAgentAudit(run.id, 'warning', 'Plan re-evaluated.', {
            type: 'plan-replan',
            steps: planSteps,
            reason: 'dead-end',
            plannerMeta: deadEndReview.meta ?? null,
            hierarchy: deadEndReview.hierarchy ?? null,
            stepId: step.id,
            activeStepId: step.id,
          });
          await logBranchAlternatives(deadEndReview.meta, 'dead-end');
          if (memoryKey) {
            await addProblemSolutionMemory({
              memoryKey,
              runId: run.id,
              problem: lastError ?? 'Repeated tool failures (dead-end).',
              countermeasure: 'Replanned due to dead-end.',
              context: {
                stepId: step.id,
                stepTitle: step.title,
                reason: 'dead-end',
              },
              tags: ['dead-end'],
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
          stepIndex = nextIndex;
          overallOk = true;
          lastError = null;
          continue;
        }
      }
      break;
    }
    const postStepReview = await runPostStepAdaptiveReviews({
      context,
      step,
      stepIndex,
      previousUrl,
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
      approvalRequestedStepId,
      approvalGrantedStepId,
      logBranchAlternatives,
    });
    planSteps = postStepReview.planSteps;
    taskType = postStepReview.taskType;
    memoryContext = postStepReview.memoryContext;
    summaryCheckpoint = postStepReview.summaryCheckpoint;
    replanCount = postStepReview.replanCount;
    selfCheckCount = postStepReview.selfCheckCount;
    stagnationCount = postStepReview.stagnationCount;
    noContextCount = postStepReview.noContextCount;
    lastExtractionCheckAt = postStepReview.lastExtractionCheckAt;
    lastError = postStepReview.lastError;
    if (postStepReview.requiresHuman) {
      requiresHuman = true;
    }
    if (postStepReview.shouldBreak) {
      break;
    }
    stepIndex += 1;
  }

  return {
    planSteps,
    stepIndex,
    taskType,
    memoryContext,
    summaryCheckpoint,
    overallOk,
    lastError,
    requiresHuman,
  };
}
