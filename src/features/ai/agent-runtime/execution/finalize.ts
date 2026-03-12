import { logAgentAudit } from '@/features/ai/agent-runtime/audit';
import { getBrowserContextSummary } from '@/features/ai/agent-runtime/browsing/context';
import { addAgentMemory } from '@/features/ai/agent-runtime/memory';
import { buildCheckpointState } from '@/features/ai/agent-runtime/memory/checkpoint';
import { getChatbotAgentRunDelegate } from '@/features/ai/agent-runtime/store-delegates';
import {
  buildSelfImprovementReviewWithLLM,
  verifyPlanWithLLM,
} from '@/features/ai/agent-runtime/planning/llm';
import type {
  AgentExecutionContext,
  PlanStep,
  PlannerMeta,
} from '@/shared/contracts/agent-runtime';
import type { InputJsonValue } from '@/shared/contracts/json';

type FinalizeRunInput = {
  context: AgentExecutionContext;
  planSteps: PlanStep[];
  taskType: PlannerMeta['taskType'] | null;
  overallOk: boolean;
  requiresHuman: boolean;
  lastError: string | null;
  summaryCheckpoint: number;
};

export async function finalizeAgentRun(input: FinalizeRunInput): Promise<{
  verificationContext: Awaited<ReturnType<typeof getBrowserContextSummary>>;
  verification: Awaited<ReturnType<typeof verifyPlanWithLLM>>;
  improvementReview: Awaited<ReturnType<typeof buildSelfImprovementReviewWithLLM>>;
}> {
  const { context, planSteps, taskType, overallOk, requiresHuman, lastError, summaryCheckpoint } =
    input;
  const {
    run,
    settings,
    preferences,
    contextRegistry,
    memoryContext,
    plannerModel,
    memorySummarizationModel,
  } = context;
  const status = requiresHuman ? 'waiting_human' : overallOk ? 'completed' : 'failed';
  const chatbotAgentRun = getChatbotAgentRunDelegate();

  if (chatbotAgentRun) {
    await chatbotAgentRun.update({
      where: { id: run.id },
      data: {
        status,
        requiresHumanIntervention: requiresHuman,
        finishedAt: new Date(),
        errorMessage: status === 'failed' ? lastError : null,
        activeStepId: null,
        planState: buildCheckpointState({
          steps: planSteps,
          activeStepId: null,
          lastError,
          approvalRequestedStepId: null,
          approvalGrantedStepId: null,
          summaryCheckpoint,
          settings,
          preferences,
          contextRegistry,
        }) as InputJsonValue,
        checkpointedAt: new Date(),
        logLines: {
          push: `[${new Date().toISOString()}] Playwright tool ${
            status === 'completed'
              ? 'completed'
              : status === 'waiting_human'
                ? 'paused'
                : 'failed'
          }.`,
        },
      },
    });
  }

  const verificationContext = await getBrowserContextSummary(run.id);
  const verification = await verifyPlanWithLLM({
    prompt: run.prompt,
    model: plannerModel,
    memory: memoryContext,
    steps: planSteps,
    browserContext: verificationContext,
    runId: run.id,
  });
  const improvementReview = await buildSelfImprovementReviewWithLLM({
    prompt: run.prompt,
    model: memorySummarizationModel,
    memory: memoryContext,
    steps: planSteps,
    verification,
    ...(taskType && { taskType }),
    lastError,
    browserContext: verificationContext,
    runId: run.id,
  });
  if (improvementReview) {
    await logAgentAudit(run.id, 'info', 'Self-improvement review completed.', {
      type: 'self-improvement',
      summary: improvementReview.summary,
      mistakes: improvementReview.mistakes,
      improvements: improvementReview.improvements,
      guardrails: improvementReview.guardrails,
      toolAdjustments: improvementReview.toolAdjustments,
      confidence: improvementReview.confidence,
    });
    await addAgentMemory({
      runId: run.id,
      scope: 'session',
      content: [
        'Self-improvement review',
        improvementReview.summary,
        improvementReview.mistakes.length
          ? `Mistakes: ${improvementReview.mistakes.join(' | ')}`
          : null,
        improvementReview.improvements.length
          ? `Improvements: ${improvementReview.improvements.join(' | ')}`
          : null,
        improvementReview.guardrails.length
          ? `Guardrails: ${improvementReview.guardrails.join(' | ')}`
          : null,
        improvementReview.toolAdjustments.length
          ? `Tool adjustments: ${improvementReview.toolAdjustments.join(' | ')}`
          : null,
      ]
        .filter(Boolean)
        .join('\n'),
      metadata: { type: 'self-improvement', confidence: improvementReview.confidence ?? null },
    });
  }

  return { verificationContext, verification, improvementReview };
}
