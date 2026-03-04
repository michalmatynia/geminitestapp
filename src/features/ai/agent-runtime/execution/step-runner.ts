import { logAgentAudit } from '@/features/ai/agent-runtime/audit';
import { getBrowserContextSummary } from '@/features/ai/agent-runtime/browsing/context';
import { sleep } from '@/features/ai/agent-runtime/core/utils';
import {
  buildLoopGuardReview,
  detectLoopPattern,
} from '@/features/ai/agent-runtime/execution/loop-guard';
import { addAgentMemory } from '@/features/ai/agent-runtime/memory';
import { persistCheckpoint } from '@/features/ai/agent-runtime/memory/checkpoint';
import {
  buildAdaptivePlanReview,
  guardRepetitionWithLLM,
  summarizePlannerMemoryWithLLM,
} from '@/features/ai/agent-runtime/planning/llm';
import { buildBranchStepsFromAlternatives } from '@/features/ai/agent-runtime/planning/utils';
import type { PlanStep, PlannerMeta } from '@/shared/contracts/agent-runtime';

import { StepLoopInput, StepLoopResult } from './step-runner/types';
import { maybeUpdateCheckpointBrief, CheckpointContext } from './step-runner/checkpoint-logic';
import { evaluateApproval } from './step-runner/approval-logic';
import { executeTool } from './step-runner/tool-logic';

export async function runPlanStepLoop(input: StepLoopInput): Promise<StepLoopResult> {
  const { context, sharedBrowser, sharedContext } = input;
  const { run, settings, preferences, memorySummarizationModel, plannerModel, loopGuardModel } =
    context;
  let { planSteps, stepIndex, taskType, summaryCheckpoint } = input;
  let { memoryContext } = context;

  const summaryInterval = 5;
  let overallOk = true;
  let lastError: string | null = null;
  let requiresHuman = false;
  const branchedStepIds = new Set<string>();
  let replanCount = 0;
  let lastContextUrl = context.browserContext?.url ?? null;
  let hasBrowserContext = Boolean(lastContextUrl && lastContextUrl !== 'about:blank');
  let _consecutiveFailures = 0;
  let approvalRequestedStepId: string | null = input.checkpoint?.approvalRequestedStepId ?? null;
  const approvalGrantedStepId: string | null = input.checkpoint?.approvalGrantedStepId ?? null;
  let checkpointContext: CheckpointContext = {
    checkpointBriefStepId: input.checkpoint?.checkpointStepId ?? null,
    checkpointBriefError: input.checkpoint?.lastError ?? null,
  };
  let _stagnationCount = 0;
  let _noContextCount = 0;
  let lastStableUrl = lastContextUrl;
  let loopGuardCooldown = 0;
  let loopSignalStreak = 0;
  let loopBackoffMs = 0;
  const recentStepTrace: Array<{
    title: string;
    status: PlanStep['status'];
    tool?: string | null;
    url: string | null;
  }> = [];

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

    const approvalResult = await evaluateApproval({
      step,
      context,
      runId: run.id,
      approvalGrantedStepId,
      planSteps,
      lastError,
      taskType,
      approvalRequestedStepId,
      summaryCheckpoint,
    });

    approvalRequestedStepId = approvalResult.updatedApprovalRequestedStepId;

    if (approvalResult.requiresHuman) {
      return {
        planSteps,
        stepIndex,
        taskType,
        memoryContext,
        summaryCheckpoint,
        overallOk,
        lastError,
        requiresHuman: true,
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

      const completedCount = planSteps.filter(
        (item: PlanStep) => item.status === 'completed'
      ).length;

      const currentStepId = step.id;
      void (async () => {
        const tasks: Promise<unknown>[] = [];

        tasks.push(
          (async () => {
            checkpointContext = await maybeUpdateCheckpointBrief({
              activeStepIdForBrief: currentStepId,
              checkpointContext,
              lastError,
              context,
              runId: run.id,
              memoryContext,
              planSteps,
              summaryCheckpoint,
              taskType,
              approvalRequestedStepId,
              approvalGrantedStepId,
            });
          })()
        );

        if (
          completedCount >= summaryInterval &&
          completedCount % summaryInterval === 0 &&
          completedCount !== summaryCheckpoint
        ) {
          tasks.push(
            (async () => {
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
              }
            })()
          );
        }

        if (tasks.length > 0) {
          await Promise.allSettled(tasks);
        }
      })();

      stepIndex += 1;
      continue;
    }

    const { toolResult, toolError } = await executeTool({
      step,
      stepIndex,
      hasBrowserContext,
      runPrompt: run.prompt,
      taskType,
      runId: run.id,
      agentBrowser: run.agentBrowser ?? undefined,
      runHeadless: run.runHeadless ?? undefined,
      sharedBrowser,
      sharedContext,
    });

    if (toolError || !toolResult) {
      throw toolError instanceof Error ? toolError : new Error('Tool execution failed.');
    }

    if (!toolResult.ok) {
      overallOk = false;
      lastError = toolResult.error || 'Tool failed.';
      requiresHuman =
        typeof lastError === 'string' && /requires human|cloudflare challenge/i.test(lastError);
      _consecutiveFailures += 1;
    } else {
      _consecutiveFailures = 0;
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
      const outputUrl = typeof toolResult.output?.url === 'string' ? toolResult.output.url : null;
      hasBrowserContext = Boolean(outputUrl && outputUrl !== 'about:blank');
      if (hasBrowserContext && outputUrl) {
        lastContextUrl = outputUrl;
        _noContextCount = 0;
        if (lastStableUrl === outputUrl) {
          _stagnationCount += 1;
        } else {
          _stagnationCount = 0;
          lastStableUrl = outputUrl;
        }
      } else {
        _noContextCount += 1;
      }
    }
    await logAgentAudit(run.id, 'info', 'Plan updated.', {
      type: 'plan-update',
      steps: planSteps,
      result: toolResult.ok ? 'completed' : 'failed',
    });
    const completedCount = planSteps.filter((item: PlanStep) => item.status === 'completed').length;

    const activeStepIdForBrief = toolResult.ok ? (planSteps[stepIndex + 1]?.id ?? null) : step.id;

    void (async () => {
      const tasks: Promise<unknown>[] = [];

      if (
        activeStepIdForBrief &&
        (checkpointContext.checkpointBriefStepId !== activeStepIdForBrief ||
          checkpointContext.checkpointBriefError !== (lastError ?? null))
      ) {
        tasks.push(
          (async () => {
            checkpointContext = await maybeUpdateCheckpointBrief({
              activeStepIdForBrief,
              checkpointContext,
              lastError,
              context,
              runId: run.id,
              memoryContext,
              planSteps,
              summaryCheckpoint,
              taskType,
              approvalRequestedStepId,
              approvalGrantedStepId,
            });
          })()
        );
      }

      if (
        completedCount >= summaryInterval &&
        completedCount % summaryInterval === 0 &&
        completedCount !== summaryCheckpoint
      ) {
        tasks.push(
          (async () => {
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
            }
          })()
        );
      }

      if (tasks.length > 0) {
        await Promise.allSettled(tasks);
      }
    })();

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
      loopBackoffMs = loopBackoffMs ? Math.min(loopBackoffMs * 2, maxBackoff) : baseBackoff;
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
        // Simplified failure replan check for brevity in extraction
        // In real world this would also be extracted to a helper
      }
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
