import { logAgentAudit } from '@/features/ai/agent-runtime/audit';
import { getBrowserContextSummary } from '@/features/ai/agent-runtime/browsing/context';
import { addAgentMemory } from '@/features/ai/agent-runtime/memory';
import {
  buildSelfImprovementReviewWithLLM,
  verifyPlanWithLLM,
} from '@/features/ai/agent-runtime/planning/llm';
import { updateChatbotRunStatus } from './finalize/finalize-utils';
import { type ImprovementReview, type FinalizeRunInput } from './finalize/finalize-types';
import type { AgentExecutionContext } from '@/shared/contracts/agent-runtime';

async function processReview(runId: string, improvementReview: ImprovementReview): Promise<void> {
  await logAgentAudit(runId, 'info', 'Self-improvement review completed.', {
    type: 'self-improvement',
    summary: improvementReview.summary,
    mistakes: improvementReview.mistakes,
    improvements: improvementReview.improvements,
    guardrails: improvementReview.guardrails,
    toolAdjustments: improvementReview.toolAdjustments,
    confidence: improvementReview.confidence,
  });
  await addAgentMemory({
    runId,
    scope: 'session',
    content: [
      'Self-improvement review',
      improvementReview.summary,
      improvementReview.mistakes.length > 0 ? `Mistakes: ${  improvementReview.mistakes.join(' | ')}` : null,
      improvementReview.improvements.length > 0 ? `Improvements: ${  improvementReview.improvements.join(' | ')}` : null,
      improvementReview.guardrails.length > 0 ? `Guardrails: ${  improvementReview.guardrails.join(' | ')}` : null,
      improvementReview.toolAdjustments.length > 0 ? `Tool adjustments: ${  improvementReview.toolAdjustments.join(' | ')}` : null,
    ].filter((s): s is string => typeof s === 'string' && s.length > 0).join('\n'),
    metadata: { type: 'self-improvement', confidence: improvementReview.confidence },
  });
}

export async function finalizeAgentRun(input: FinalizeRunInput): Promise<any> {
  const { context, planSteps, taskType, overallOk, requiresHuman, lastError, summaryCheckpoint } = input;
  const typedContext = context as AgentExecutionContext;
  const { run, settings, preferences, contextRegistry, memoryContext, plannerModel, memorySummarizationModel } = typedContext;

  await updateChatbotRunStatus({
    runId: run.id,
    runPrompt: run.prompt,
    settings,
    preferences,
    contextRegistry,
    planSteps,
    requiresHuman,
    overallOk,
    lastError,
    summaryCheckpoint,
  });

  const verificationContext = await getBrowserContextSummary(run.id);
  const verification = await verifyPlanWithLLM({
    prompt: run.prompt,
    model: plannerModel,
    memory: memoryContext,
    steps: planSteps,
    browserContext: verificationContext,
    runId: run.id,
  });
  
  const improvementReview: ImprovementReview | null = await buildSelfImprovementReviewWithLLM({
    prompt: run.prompt,
    model: memorySummarizationModel,
    memory: memoryContext,
    steps: planSteps,
    verification,
    ...(taskType !== null ? { taskType } : {}),
    lastError,
    browserContext: verificationContext,
    runId: run.id,
  });
  
  if (improvementReview !== null) {
    await processReview(run.id, improvementReview);
  }

  return { verificationContext, verification, improvementReview };
}
