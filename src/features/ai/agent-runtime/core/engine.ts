import 'server-only';

import { randomUUID } from 'crypto';


import { logAgentAudit } from '@/features/ai/agent-runtime/audit';
import { DEBUG_CHATBOT } from '@/features/ai/agent-runtime/core/config';
import { prepareRunContext } from '@/features/ai/agent-runtime/execution/context';
import { finalizeAgentRun } from '@/features/ai/agent-runtime/execution/finalize';
import { initializePlanState } from '@/features/ai/agent-runtime/execution/plan';
import { runPlanStepLoop } from '@/features/ai/agent-runtime/execution/step-runner';
import {
  buildCheckpointState,
  parseCheckpoint,
} from '@/features/ai/agent-runtime/memory/checkpoint';
import {
  getAgentAuditLogDelegate,
  getChatbotAgentRunDelegate,
} from '@/features/ai/agent-runtime/store-delegates';
import type { PlanStep, AgentRuntimeRunRecord, AgentPlanSettings, AgentRuntimeExecutionPreferences } from '@/shared/contracts/agent-runtime';
import type { InputJsonValue } from '@/shared/contracts/json';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import type { Browser, BrowserContext } from 'playwright';
import { addRunSummaryMemory, addSelfImprovementMemory, type ExtractionSummary } from './engine-memory';
import { initializeBrowserAndContext, performToolExecutionFallback } from './engine-utils';

type ExtractionAuditRecord = {
  metadata?: unknown;
};

interface ChatbotAgentRunDelegate {
  findUnique<T>(args: { where: { id: string } }): Promise<T | null>;
  update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<unknown>;
}

async function fetchExtractionSummary(runId: string): Promise<ExtractionSummary | null> {
  const agentAuditLog = getAgentAuditLogDelegate();
  if (agentAuditLog === null) return null;

  const latestExtraction = await agentAuditLog.findFirst<ExtractionAuditRecord>({
    where: {
      runId,
      message: { in: ['Extracted product names.', 'Extracted emails.'] },
    },
    orderBy: { createdAt: 'desc' },
    select: { metadata: true },
  });

  const metadata = latestExtraction?.metadata;
  if (metadata === null || metadata === undefined || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const m = metadata as Record<string, unknown>;

  const extractionType = typeof m['extractionType'] === 'string' ? m['extractionType'] : undefined;
  const extractedCount = typeof m['extractedCount'] === 'number' ? m['extractedCount'] : undefined;
  const items = Array.isArray(m['items']) ? (m['items'] as unknown[]).slice(0, 10).map(String) : undefined;

  return {
    ...(extractionType !== undefined && { extractionType }),
    ...(extractedCount !== undefined && { extractedCount }),
    ...(items !== undefined && { items }),
  };
}

async function handleRunError(runId: string, error: unknown, chatbotAgentRun: ChatbotAgentRunDelegate | null): Promise<void> {
  const errorId = randomUUID();
  const message = error instanceof Error ? error.message : 'Unknown error';

  await ErrorSystem.captureException(error, {
    service: 'agent-engine',
    runId,
    errorId,
  });

  if (chatbotAgentRun !== null) {
    try {
      await chatbotAgentRun.update({
        where: { id: runId },
        data: {
          status: 'failed',
          errorMessage: message,
          finishedAt: new Date(),
          activeStepId: null,
          planState: null,
          checkpointedAt: new Date(),
          logLines: { push: `[${new Date().toISOString()}] Agent failed (${errorId}).` },
        },
      });
    } catch (innerError) {
      await ErrorSystem.captureException(innerError);
    }
  }
}

interface HumanWaitOptions {
  run: AgentRuntimeRunRecord;
  planSteps: PlanStep[];
  stepIndex: number;
  lastError: string | null;
  taskType: string | null;
  summaryCheckpoint: number;
  settings: AgentPlanSettings;
  preferences: AgentRuntimeExecutionPreferences;
  chatbotAgentRun: ChatbotAgentRunDelegate;
  contextRegistry: unknown;
}

async function handleHumanWait(options: HumanWaitOptions): Promise<void> {
  const { run, planSteps, stepIndex, lastError, taskType, summaryCheckpoint, settings, preferences, chatbotAgentRun, contextRegistry } = options;
  await chatbotAgentRun.update({
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
        contextRegistry,
      }) as InputJsonValue,
      checkpointedAt: new Date(),
      logLines: { push: `[${new Date().toISOString()}] Waiting for human input.` },
    },
  });
  await logAgentAudit(run.id, 'warning', 'Waiting for human input.', { result: 'waiting_human', error: lastError });
}

export async function runAgentControlLoop(runId: string): Promise<void> {
  let sharedBrowser: Browser | null = null;
  let sharedContext: BrowserContext | null = null;
  const chatbotAgentRun = getChatbotAgentRunDelegate() as ChatbotAgentRunDelegate | null;
  try {
    if (chatbotAgentRun === null) {
      if (DEBUG_CHATBOT) await ErrorSystem.logWarning('Agent tables not initialized.', { service: 'agent-engine' });
      return;
    }
    const r = await chatbotAgentRun.findUnique<AgentRuntimeRunRecord>({ where: { id: runId } });
    if (r === null) {
      if (DEBUG_CHATBOT) await ErrorSystem.logWarning('Run not found', { service: 'agent-engine', runId });
      return;
    }
    const run: AgentRuntimeRunRecord = r;
    const { browser, context: bCtx } = await initializeBrowserAndContext(run.agentBrowser, run.runHeadless, runId);
    sharedBrowser = browser; sharedContext = bCtx;
    await logAgentAudit(run.id, 'info', 'Agent loop started.');
    const context = await prepareRunContext({ id: run.id, prompt: run.prompt, model: run.model ?? null, memoryKey: run.memoryKey ?? null, personaId: run.personaId ?? null, planState: run.planState, agentBrowser: run.agentBrowser, runHeadless: run.runHeadless });
    const checkpoint = parseCheckpoint(run.planState);
    const planState = await initializePlanState({ context, checkpoint });
    const { decision, summaryCheckpoint, preferences, planSteps, taskType, stepIndex } = planState;
    await logAgentAudit(run.id, 'info', 'Decision made.', decision);
    if (decision.action === 'tool') {
      const cp = checkpoint ? { approvalRequestedStepId: checkpoint.approvalRequestedStepId ?? null, approvalGrantedStepId: checkpoint.approvalGrantedStepId ?? null, checkpointStepId: checkpoint.checkpointStepId ?? null, lastError: checkpoint.lastError ?? null } : null;
      const sResult = await runPlanStepLoop({ context, sharedBrowser, sharedContext, planSteps, stepIndex, taskType, summaryCheckpoint, checkpoint: cp });
      if (sResult.requiresHuman) {
        await handleHumanWait({ run, planSteps: sResult.planSteps, stepIndex: sResult.stepIndex, lastError: sResult.lastError, taskType: sResult.taskType, summaryCheckpoint: sResult.summaryCheckpoint, settings: context.settings, preferences, chatbotAgentRun, contextRegistry: context.contextRegistry });
        return;
      }
      let overallOk = sResult.overallOk; let lastError = sResult.lastError;
      if (sResult.planSteps.length === 0) {
        const fResult = await performToolExecutionFallback({ run, taskType: sResult.taskType, sharedBrowser, sharedContext });
        overallOk = fResult.ok; lastError = fResult.error;
      }
      const fRun = await finalizeAgentRun({ context, planSteps: sResult.planSteps, taskType: sResult.taskType, overallOk, requiresHuman: sResult.requiresHuman, lastError, summaryCheckpoint: sResult.summaryCheckpoint });
      if (fRun.improvementReview !== null && fRun.improvementReview !== undefined && context.memoryKey !== null && context.memoryKey !== '') {
        await addSelfImprovementMemory({ run, memoryKey: context.memoryKey, overallOk, taskType: sResult.taskType, verification: fRun.verification ?? null, improvementReview: fRun.improvementReview, memoryValidationModel: context.memoryValidationModel, memorySummarizationModel: context.memorySummarizationModel, resolvedModel: context.resolvedModel });
      }
      if (context.memoryKey !== null && context.memoryKey !== '') {
        const extractionSummary = await fetchExtractionSummary(run.id);
        await addRunSummaryMemory({ run, memoryKey: context.memoryKey, overallOk, taskType: sResult.taskType, finalUrl: fRun.verificationContext?.url ?? null, verification: fRun.verification ?? null, extractionSummary, planSteps: sResult.planSteps, memoryValidationModel: context.memoryValidationModel, memorySummarizationModel: context.memorySummarizationModel, resolvedModel: context.resolvedModel });
      }
      await logAgentAudit(run.id, overallOk ? 'info' : 'error', 'Playwright tool finished.', { result: overallOk ? 'completed' : 'failed', error: lastError });
    } else if (decision.action === 'respond') {
      const steps = planSteps.map(s => ({ ...s, status: 'completed' as const }));
      await chatbotAgentRun.update({ where: { id: run.id }, data: { status: 'completed', finishedAt: new Date(), activeStepId: null, planState: buildCheckpointState({ steps, activeStepId: null, approvalRequestedStepId: null, approvalGrantedStepId: null, summaryCheckpoint, settings: context.settings, preferences, contextRegistry: context.contextRegistry }) as InputJsonValue, checkpointedAt: new Date(), logLines: { push: `[${new Date().toISOString()}] Agent responded (scaffold).` } } });
    }
  } catch (error) {
    await handleRunError(runId, error, chatbotAgentRun);
  } finally {
    if (sharedContext) await sharedContext.close().catch(() => {});
    if (sharedBrowser) await sharedBrowser.close().catch(() => {});
  }
}
