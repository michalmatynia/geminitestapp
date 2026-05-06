import { getChatbotAgentRunDelegate } from '@/features/ai/agent-runtime/store-delegates';
import { buildCheckpointState } from '@/features/ai/agent-runtime/memory/checkpoint';
import type { PlanStep, AgentRunStatusType } from '@/shared/contracts/agent-runtime';
import type { InputJsonValue } from '@/shared/contracts/json';

export interface FinalizeRunInput {
  runId: string;
  runPrompt: string;
  settings: unknown; // Ideally typed from AgentExecutionContext
  preferences: unknown;
  contextRegistry: unknown;
  planSteps: PlanStep[];
  requiresHuman: boolean;
  overallOk: boolean;
  lastError: string | null;
  summaryCheckpoint: number;
}

export async function updateChatbotRunStatus(input: FinalizeRunInput): Promise<void> {
  const chatbotAgentRun = getChatbotAgentRunDelegate();
  if (chatbotAgentRun === null) return;

  let status: AgentRunStatusType = 'failed';
  if (input.requiresHuman) {
    status = 'waiting_human';
  } else if (input.overallOk) {
    status = 'completed';
  }

  await chatbotAgentRun.update({
    where: { id: input.runId },
    data: {
      status,
      requiresHumanIntervention: input.requiresHuman,
      finishedAt: new Date(),
      errorMessage: status === 'failed' ? input.lastError : null,
      activeStepId: null,
      planState: buildCheckpointState({
        steps: input.planSteps,
        activeStepId: null,
        lastError: input.lastError,
        approvalRequestedStepId: null,
        approvalGrantedStepId: null,
        summaryCheckpoint: input.summaryCheckpoint,
        settings: input.settings,
        preferences: input.preferences,
        contextRegistry: input.contextRegistry,
      }) as InputJsonValue,
      checkpointedAt: new Date(),
      logLines: {
        push: `[${new Date().toISOString()}] Playwright tool ${status}.`,
      },
    },
  });
}
