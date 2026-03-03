 
import { logAgentAudit } from '@/features/ai/agent-runtime/audit';
import { getBrowserContextSummary } from '@/features/ai/agent-runtime/browsing/context';
import { 
  buildCheckpointBriefWithLLM 
} from '@/features/ai/agent-runtime/planning/llm';
import { 
  persistCheckpoint 
} from '@/features/ai/agent-runtime/memory/checkpoint';
import { 
  AgentExecutionContext, 
  PlanStep, 
  PlannerMeta 
} from '@/shared/contracts/agent-runtime';

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
    summaryCheckpoint, 
    taskType, 
    approvalRequestedStepId, 
    approvalGrantedStepId 
  } = args;

  if (!activeStepIdForBrief) return checkpointContext;
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

  await persistCheckpoint({
    runId,
    steps: planSteps,
    activeStepId: activeStepIdForBrief,
    lastError,
    taskType,
    approvalRequestedStepId,
    approvalGrantedStepId,
    checkpointBrief: brief.summary,
    checkpointNextActions: brief.nextActions,
    checkpointRisks: brief.risks,
    checkpointStepId: nextContext.checkpointBriefStepId,
    checkpointCreatedAt: new Date().toISOString(),
    summaryCheckpoint,
    settings: context.settings,
    preferences: context.preferences,
  });

  await logAgentAudit(runId, 'info', 'Checkpoint brief saved.', {
    type: 'checkpoint-brief',
    stepId: activeStepIdForBrief,
    summary: brief.summary,
  });

  return nextContext;
}
