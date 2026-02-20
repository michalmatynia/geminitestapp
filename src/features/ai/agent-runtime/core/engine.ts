import 'server-only';

import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

import { Prisma } from '@prisma/client';

import { logAgentAudit } from '@/features/ai/agent-runtime/audit';
import {
  DEFAULT_OLLAMA_MODEL,
  DEBUG_CHATBOT,
} from '@/features/ai/agent-runtime/core/config';
import { reminderList } from '@/features/ai/agent-runtime/core/utils';
import { prepareRunContext } from '@/features/ai/agent-runtime/execution/context';
import { finalizeAgentRun } from '@/features/ai/agent-runtime/execution/finalize';
import { initializePlanState } from '@/features/ai/agent-runtime/execution/plan';
import { runPlanStepLoop } from '@/features/ai/agent-runtime/execution/step-runner';
import { validateAndAddAgentLongTermMemory } from '@/features/ai/agent-runtime/memory';
import {
  buildCheckpointState,
  parseCheckpoint,
} from '@/features/ai/agent-runtime/memory/checkpoint';
import {
  appendTaskTypeToPrompt,
  decideNextAction,
} from '@/features/ai/agent-runtime/planning/utils';
import { runAgentTool } from '@/features/ai/agent-runtime/tools';
import {
  launchBrowser,
  createBrowserContext,
} from '@/features/ai/agent-runtime/tools/playwright/browser';
import type {
  AgentDecision,
  PlanStep,
  PlannerMeta,
} from '@/shared/contracts/agent-runtime/agent';
import { ErrorSystem } from '@/features/observability/server';
import prisma from '@/shared/lib/db/prisma';

import type { Browser, BrowserContext } from 'playwright';

export async function runAgentControlLoop(runId: string): Promise<void> {
  let sharedBrowser: Browser | null = null;
  let sharedContext: BrowserContext | null = null;
  try {
    if (!('chatbotAgentRun' in prisma)) {
      if (DEBUG_CHATBOT) {
        void ErrorSystem.logWarning('Agent tables not initialized.', { service: 'agent-engine' });
      }
      return;
    }

    const run = await prisma.chatbotAgentRun.findUnique({
      where: { id: runId },
    });

    if (!run) {
      if (DEBUG_CHATBOT) {
        void ErrorSystem.logWarning('Run not found', { service: 'agent-engine', runId });
      }
      return;
    }

    sharedBrowser = await launchBrowser(
      run.agentBrowser || 'chromium',
      run.runHeadless ?? true
    );
    const runDir = path.join(process.cwd(), 'tmp', 'chatbot-agent', runId);
    await fs.mkdir(runDir, { recursive: true });
    sharedContext = await createBrowserContext(sharedBrowser, runDir);

    await logAgentAudit(run.id, 'info', 'Agent loop started.');
    const context = await prepareRunContext({
      id: run.id,
      prompt: run.prompt,
      model: run.model ?? DEFAULT_OLLAMA_MODEL,
      memoryKey: run.memoryKey ?? null,
      planState: run.planState,
      agentBrowser: run.agentBrowser,
      runHeadless: run.runHeadless,
    });
    const {
      settings,
      preferences: basePreferences,
      memoryValidationModel,
      memorySummarizationModel,
      memoryKey,
      resolvedModel,
    } = context;
    let { memoryContext } = context;
    let planSteps: PlanStep[] = [];
    let taskType: PlannerMeta['taskType'] | null = null;
    let decision: AgentDecision = decideNextAction(run.prompt, memoryContext);
    let stepIndex = 0;
    const checkpoint = parseCheckpoint(run.planState);
    let summaryCheckpoint = checkpoint?.summaryCheckpoint ?? 0;
    let preferences = basePreferences;
    ({
      planSteps,
      taskType,
      decision,
      stepIndex,
      summaryCheckpoint,
      preferences,
    } = await initializePlanState({
      context,
      checkpoint,
    }));

    await logAgentAudit(run.id, 'info', 'Decision made.', decision);

    if (decision.action === 'tool') {
      await logAgentAudit(run.id, 'warning', 'Tool execution queued.', {
        toolName: decision.toolName,
        reason: decision.reason,
      });
      await logAgentAudit(run.id, 'info', 'Playwright tool starting.');

      let overallOk = true;
      let lastError: string | null = null;
      let requiresHuman = false;
      const checkpointForStepLoop = checkpoint
        ? {
          approvalRequestedStepId: checkpoint.approvalRequestedStepId ?? null,
          approvalGrantedStepId: checkpoint.approvalGrantedStepId ?? null,
          checkpointStepId: checkpoint.checkpointStepId ?? null,
          lastError: checkpoint.lastError ?? null,
        }
        : null;
      const stepRunResult = await runPlanStepLoop({
        context,
        sharedBrowser,
        sharedContext,
        planSteps,
        stepIndex,
        taskType,
        summaryCheckpoint,
        checkpoint: checkpointForStepLoop,
      });
      planSteps = stepRunResult.planSteps;
      stepIndex = stepRunResult.stepIndex;
      taskType = stepRunResult.taskType;
      memoryContext = stepRunResult.memoryContext;
      summaryCheckpoint = stepRunResult.summaryCheckpoint;
      overallOk = stepRunResult.overallOk;
      lastError = stepRunResult.lastError;
      requiresHuman = stepRunResult.requiresHuman;

      if (requiresHuman) {
        await prisma.chatbotAgentRun.update({
          where: { id: run.id },
          data: {
            status: 'waiting_human',
            requiresHumanIntervention: true,
            activeStepId: planSteps[stepIndex]?.id ?? null,
            planState: buildCheckpointState({
              steps: planSteps,
              activeStepId: planSteps[stepIndex]?.id ?? null,
              lastError,
              taskType,
              approvalRequestedStepId: null,
              approvalGrantedStepId: null,
              summaryCheckpoint,
              settings,
              preferences,
            }),
            checkpointedAt: new Date(),
            logLines: {
              push: `[${new Date().toISOString()}] Waiting for human input.`,
            },
          },
        });
        await logAgentAudit(run.id, 'warning', 'Waiting for human input.', {
          result: 'waiting_human',
          error: lastError,
        });
        return;
      }

      if (planSteps.length === 0) {
        if (!sharedBrowser || !sharedContext) {
          throw new Error('Browser context is not available.');
        }
        const toolResult = await runAgentTool(
          {
            name: 'playwright',
            input: {
              prompt: appendTaskTypeToPrompt(run.prompt, taskType),
              browser: run.agentBrowser || 'chromium',
              runId: run.id,
              runHeadless: run.runHeadless,
            },
          },
          sharedBrowser,
          sharedContext
        );
        overallOk = toolResult.ok;
        lastError = toolResult.ok ? null : toolResult.error || 'Tool failed.';
      }

      const { verificationContext, verification, improvementReview } =
        await finalizeAgentRun({
          context,
          planSteps,
          taskType,
          overallOk,
          requiresHuman,
          lastError,
          summaryCheckpoint,
        });
      if (improvementReview && memoryKey) {
        const memoryResult = await validateAndAddAgentLongTermMemory({
          memoryKey,
          runId: run.id,
          content: [
            `Self-improvement review: ${improvementReview.summary}`,
            improvementReview.mistakes.length
              ? reminderList('Mistakes', improvementReview.mistakes)
              : null,
            improvementReview.improvements.length
              ? reminderList('Improvements', improvementReview.improvements)
              : null,
            improvementReview.guardrails.length
              ? reminderList('Guardrails', improvementReview.guardrails)
              : null,
            improvementReview.toolAdjustments.length
              ? reminderList(
                'Tool adjustments',
                improvementReview.toolAdjustments
              )
              : null,
          ]
            .filter(Boolean)
            .join('\n'),
          summary: improvementReview.summary,
          tags: ['self-improvement', overallOk ? 'completed' : 'failed'],
          metadata: {
            prompt: run.prompt,
            taskType,
            status: overallOk ? 'completed' : 'failed',
            verification: verification ?? null,
            mistakes: improvementReview.mistakes,
            improvements: improvementReview.improvements,
            guardrails: improvementReview.guardrails,
            toolAdjustments: improvementReview.toolAdjustments,
            confidence: improvementReview.confidence ?? null,
          },
          importance: overallOk ? 3 : 4,
          model: memoryValidationModel ?? resolvedModel,
          summaryModel: memorySummarizationModel ?? resolvedModel,
          prompt: run.prompt,
        });
        if (memoryResult?.skipped) {
          await logAgentAudit(run.id, 'warning', 'Long-term memory rejected.', {
            type: 'memory-validation',
            model: memoryResult.validation.model,
            issues: memoryResult.validation.issues,
            reason: memoryResult.validation.reason,
            scope: 'self-improvement',
          });
        }
      }
      if (memoryKey) {
        const finalUrl = verificationContext?.url ?? null;
        let extractionSummary: {
          extractionType?: string;
          extractedCount?: number;
          items?: string[];
        } | null = null;
        if ('agentAuditLog' in prisma) {
          const latestExtraction = await prisma.agentAuditLog.findFirst({
            where: {
              runId: run.id,
              message: {
                in: ['Extracted product names.', 'Extracted emails.'],
              },
            },
            orderBy: { createdAt: 'desc' },
            select: { metadata: true },
          });
          if (latestExtraction?.metadata) {
            const metadata = latestExtraction.metadata as {
              extractionType?: string;
              extractedCount?: number;
              items?: string[];
            };
            extractionSummary = {
              ...(metadata.extractionType && { extractionType: metadata.extractionType }),
              ...(typeof metadata.extractedCount === 'number' && {
                extractedCount: metadata.extractedCount,
              }),
              ...(Array.isArray(metadata.items) && {
                items: metadata.items.slice(0, 10).map(String),
              }),
            };
          }
        }
        const stepSummary = planSteps.map((step: PlanStep) => ({
          title: step.title,
          status: step.status,
          phase: step.phase ?? null,
          priority: step.priority ?? null,
        }));
        const summaryLines = [
          `Task: ${run.prompt}`,
          `Status: ${overallOk ? 'completed' : 'failed'}`,
          taskType ? `Task type: ${taskType}` : null,
          finalUrl ? `URL: ${finalUrl}` : null,
          verification?.verdict
            ? `Verification: ${verification.verdict}`
            : null,
          extractionSummary?.extractionType
            ? `Extraction: ${extractionSummary.extractionType} (${extractionSummary.extractedCount ?? 0})`
            : null,
        ].filter(Boolean);
        const summary = summaryLines.join(' · ');
        const runDetails = {
          id: run.id,
          prompt: run.prompt,
          model: run.model,
          tools: run.tools,
          searchProvider: run.searchProvider,
          agentBrowser: run.agentBrowser,
          runHeadless: run.runHeadless,
          status: overallOk ? 'completed' : 'failed',
          requiresHumanIntervention: run.requiresHumanIntervention,
          errorMessage: run.errorMessage,
          memoryKey: run.memoryKey,
          recordingPath: run.recordingPath,
          activeStepId: run.activeStepId,
          startedAt: run.startedAt,
          finishedAt: run.finishedAt,
          createdAt: run.createdAt,
          updatedAt: run.updatedAt,
          planState: run.planState ?? null,
        };
        const memoryResult = await validateAndAddAgentLongTermMemory({
          memoryKey,
          runId: run.id,
          content: [
            summary,
            'Steps:',
            ...stepSummary.map(
              (step: { title: string; status: string; phase: string | null; priority: number | null }, index: number) =>
                `${index + 1}. ${step.title} (${step.status}${
                  step.phase ? `, ${step.phase}` : ''
                })`
            ),
            verification?.evidence?.length
              ? `Evidence: ${verification.evidence.join(' | ')}`
              : null,
            verification?.missing?.length
              ? `Missing: ${verification.missing.join(' | ')}`
              : null,
            verification?.followUp
              ? `Follow-up: ${verification.followUp}`
              : null,
            extractionSummary?.items?.length
              ? `Sample items: ${extractionSummary.items.join(' | ')}`
              : null,
          ]
            .filter(Boolean)
            .join('\n'),
          summary,
          tags: ['agent-run', overallOk ? 'completed' : 'failed'],
          metadata: {
            run: runDetails,
            prompt: run.prompt,
            taskType,
            status: overallOk ? 'completed' : 'failed',
            url: finalUrl,
            runId: run.id,
            steps: stepSummary,
            verification: verification ?? null,
            extraction: extractionSummary,
          },
          importance: overallOk ? 3 : 2,
          model: memoryValidationModel ?? resolvedModel,
          summaryModel: memorySummarizationModel ?? resolvedModel,
          prompt: run.prompt,
        });
        if (memoryResult?.skipped) {
          await logAgentAudit(run.id, 'warning', 'Long-term memory rejected.', {
            type: 'memory-validation',
            model: memoryResult.validation.model,
            issues: memoryResult.validation.issues,
            reason: memoryResult.validation.reason,
            scope: 'run-summary',
          });
        }
      }
      await logAgentAudit(
        run.id,
        overallOk ? 'info' : 'error',
        'Playwright tool finished.',
        {
          result: overallOk ? 'completed' : 'failed',
          error: lastError,
        }
      );
      return;
    }

    if (decision.action === 'respond') {
      if (planSteps.length > 0) {
        planSteps = planSteps.map((step: PlanStep) => ({
          ...step,
          status: 'completed',
        }));
        await logAgentAudit(run.id, 'info', 'Plan updated.', {
          type: 'plan-update',
          steps: planSteps,
          result: 'completed',
        });
      }
      await prisma.chatbotAgentRun.update({
        where: { id: run.id },
        data: {
          status: 'completed',
          finishedAt: new Date(),
          activeStepId: null,
          planState: buildCheckpointState({
            steps: planSteps,
            activeStepId: null,
            approvalRequestedStepId: null,
            approvalGrantedStepId: null,
            summaryCheckpoint,
            settings,
            preferences,
          }),
          checkpointedAt: new Date(),
          logLines: {
            push: `[${new Date().toISOString()}] Agent responded (scaffold).`,
          },
        },
      });
      return;
    }

    await prisma.chatbotAgentRun.update({
      where: { id: run.id },
      data: {
        status: 'waiting_human',
        requiresHumanIntervention: true,
        finishedAt: new Date(),
        activeStepId: planSteps[stepIndex]?.id ?? null,
        planState: buildCheckpointState({
          steps: planSteps,
          activeStepId: planSteps[stepIndex]?.id ?? null,
          lastError: checkpoint?.lastError ?? null,
          approvalRequestedStepId: null,
          approvalGrantedStepId: null,
          summaryCheckpoint,
          settings,
          preferences,
        }),
        checkpointedAt: new Date(),
        logLines: {
          push: `[${new Date().toISOString()}] Waiting for human input.`,
        },
      },
    });
  } catch (error) {
    const errorId = randomUUID();
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    // Use centralized error system
    await ErrorSystem.captureException(error, {
      service: 'agent-engine',
      runId,
      errorId,
    });

    try {
      if ('chatbotAgentRun' in prisma) {
        await prisma.chatbotAgentRun.update({
          where: { id: runId },
          data: {
            status: 'failed',
            errorMessage: message,
            finishedAt: new Date(),
            activeStepId: null,
            planState: Prisma.JsonNull,
            checkpointedAt: new Date(),
            logLines: {
              push: `[${new Date().toISOString()}] Agent failed (${errorId}).`,
            },
          },
        });
      }
    } catch (innerError) {
      try {
        const { ErrorSystem } = await import('@/features/observability/services/error-system');
        void ErrorSystem.captureException(innerError, { 
          service: 'agent-engine', 
          action: 'persistError',
          targetRunId: runId,
          originalErrorId: errorId
        });
      } catch (logError) {
        if (DEBUG_CHATBOT) {
          const { logger } = await import('@/shared/utils/logger');
          logger.error('[chatbot][agent][engine] Failed to persist error (and logging failed)', logError, {
            runId,
            errorId,
            innerError,
          });
        }
      }
    }
  } finally {
    if (sharedContext) {
      await sharedContext.close().catch(() => {});
    }
    if (sharedBrowser) {
      await sharedBrowser.close().catch(() => {});
    }
  }
}
