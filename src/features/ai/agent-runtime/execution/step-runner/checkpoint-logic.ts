import { logAgentAudit } from '@/features/ai/agent-runtime/audit';
import { getBrowserContextSummary } from '@/features/ai/agent-runtime/browsing/context';
import { persistCheckpoint } from '@/features/ai/agent-runtime/memory/checkpoint';
import { buildCheckpointBriefWithLLM } from '@/features/ai/agent-runtime/planning/llm';
import { type AgentExecutionContext, type PlanStep, type PlannerMeta } from '@/shared/contracts/agent-runtime';

export type CheckpointContext = {
  checkpointBriefStepId: string | null;
  checkpointBriefError: string | null;
};

export async function maybeUpdateCheckpointBrief(args: {
  activeStepIdForBrief: string | null;
  checkpointContext: CheckpointContext;
  lastError: string | null;
  context: AgentExecutionContext;
  runId: string;
  memoryContext: string[];
  planSteps: PlanStep[];
  summaryCheckpoint: number;
  taskType: PlannerMeta['taskType'] | null;
  approvalRequestedStepId: string | null;
  approvalGrantedStepId: string | null;
}): Promise<CheckpointContext> {
  const {
    activeStepIdForBrief,
    checkpointContext,
    lastError,
    context,
    runId,
    memoryContext,
    planSteps,
  } = args;

  if (activeStepIdForBrief === null) return checkpointContext;
  if (
    checkpointContext.checkpointBriefStepId === activeStepIdForBrief &&
    checkpointContext.checkpointBriefError === (lastError ?? null)
  ) {
    return checkpointContext;
  }

  const briefContext = await getBrowserContextSummary(runId);
  const brief = await buildCheckpointBriefWithLLM({
    prompt: context.run.prompt,
    model: context.memorySummarizationModel,
    memory: memoryContext,
    steps: planSteps,
    activeStepId: activeStepIdForBrief,
    lastError,
    browserContext: briefContext,
    runId,
  });

  if (!brief) return checkpointContext;

  const nextContext = {
    checkpointBriefStepId: activeStepIdForBrief,
    checkpointBriefError: lastError ?? null,
  };

  await saveCheckpoint(args, brief, nextContext.checkpointBriefStepId);

  await logAgentAudit(runId, 'info', 'Checkpoint brief saved.', {
    type: 'checkpoint-brief',
    stepId: activeStepIdForBrief,
    summary: brief.summary,
  });

  return nextContext;
}

async function saveCheckpoint(
  args: {
    planSteps: PlanStep[];
    lastError: string | null;
    taskType: PlannerMeta['taskType'] | null;
    approvalRequestedStepId: string | null;
    approvalGrantedStepId: string | null;
    summaryCheckpoint: number;
    context: AgentExecutionContext;
    runId: string;
  },
  brief: { summary: string; nextActions: string[]; risks: string[] },
  checkpointStepId: string
): Promise<void> {
  await persistCheckpoint({
    runId: args.runId,
    steps: args.planSteps,
    activeStepId: checkpointStepId,
    lastError: args.lastError,
    taskType: args.taskType,
    approvalRequestedStepId: args.approvalRequestedStepId,
    approvalGrantedStepId: args.approvalGrantedStepId,
    checkpointBrief: brief.summary,
    checkpointNextActions: brief.nextActions,
    checkpointRisks: brief.risks,
    checkpointStepId,
    checkpointCreatedAt: new Date().toISOString(),
    summaryCheckpoint: args.summaryCheckpoint,
    settings: args.context.settings,
    preferences: args.context.preferences,
    contextRegistry: args.context.contextRegistry,
  });
}
