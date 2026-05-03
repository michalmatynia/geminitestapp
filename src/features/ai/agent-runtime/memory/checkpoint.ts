import { logAgentAudit } from '@/features/ai/agent-runtime/audit';
import {
  type AgentCheckpoint,
  agentCheckpointSchema,
  type AgentPlanPreferences,
  type AgentPlanSettings,
  type PlanStep,
  type PlannerMeta,
} from '@/shared/contracts/agent-runtime';
import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import type { InputJsonValue } from '@/shared/contracts/json';
import { getChatbotAgentRunDelegate } from '@/features/ai/agent-runtime/store-delegates';

export function parseCheckpoint(payload: unknown): AgentCheckpoint | null {
  if (payload === null || payload === undefined || typeof payload !== 'object') return null;

  const result = agentCheckpointSchema.safeParse({
    ...(payload as Record<string, unknown>),
    updatedAt: (payload as Partial<AgentCheckpoint>).updatedAt ?? new Date().toISOString(),
  });

  return result.success ? result.data : null;
}

export function buildCheckpointState(payload: {
  steps: PlanStep[];
  activeStepId: string | null;
  lastError?: string | null;
  taskType?: PlannerMeta['taskType'] | null;
  resumeRequestedAt?: string | null;
  resumeProcessedAt?: string | null;
  approvalRequestedStepId?: string | null;
  approvalGrantedStepId?: string | null;
  checkpointBrief?: string | null;
  checkpointNextActions?: string[] | null;
  checkpointRisks?: string[] | null;
  checkpointStepId?: string | null;
  checkpointCreatedAt?: string | null;
  summaryCheckpoint?: number | null;
  settings?: AgentPlanSettings | null;
  preferences?: AgentPlanPreferences | null;
  contextRegistry?: ContextRegistryConsumerEnvelope | null;
}): AgentCheckpoint {
  return {
    steps: payload.steps,
    activeStepId: payload.activeStepId,
    ...getWorkflowFields(payload),
    ...getBriefFields(payload),
    ...getConfigFields(payload),
    updatedAt: new Date().toISOString(),
  };
}

function getWorkflowFields(payload: Partial<AgentCheckpoint>): Partial<AgentCheckpoint> {
  return {
    lastError: payload.lastError ?? null,
    taskType: payload.taskType ?? null,
    resumeRequestedAt: payload.resumeRequestedAt ?? null,
    resumeProcessedAt: payload.resumeProcessedAt ?? null,
    approvalRequestedStepId: payload.approvalRequestedStepId ?? null,
    approvalGrantedStepId: payload.approvalGrantedStepId ?? null,
  };
}

function getBriefFields(payload: Partial<AgentCheckpoint>): Partial<AgentCheckpoint> {
  return {
    checkpointBrief: payload.checkpointBrief ?? null,
    checkpointNextActions: payload.checkpointNextActions ?? null,
    checkpointRisks: payload.checkpointRisks ?? null,
    checkpointStepId: payload.checkpointStepId ?? null,
    checkpointCreatedAt: payload.checkpointCreatedAt ?? null,
    summaryCheckpoint: payload.summaryCheckpoint ?? null,
  };
}

function getConfigFields(payload: Partial<AgentCheckpoint>): Partial<AgentCheckpoint> {
  return {
    settings: payload.settings ?? null,
    preferences: payload.preferences ?? null,
    contextRegistry: payload.contextRegistry ?? null,
  };
}

export async function persistCheckpoint(payload: {
  runId: string;
  steps: PlanStep[];
  activeStepId: string | null;
  lastError?: string | null;
  taskType?: PlannerMeta['taskType'] | null;
  resumeRequestedAt?: string | null;
  resumeProcessedAt?: string | null;
  approvalRequestedStepId?: string | null;
  approvalGrantedStepId?: string | null;
  checkpointBrief?: string | null;
  checkpointNextActions?: string[] | null;
  checkpointRisks?: string[] | null;
  checkpointStepId?: string | null;
  checkpointCreatedAt?: string | null;
  summaryCheckpoint?: number | null;
  settings?: AgentPlanSettings | null;
  preferences?: AgentPlanPreferences | null;
  contextRegistry?: ContextRegistryConsumerEnvelope | null;
}): Promise<void> {
  const chatbotAgentRun = getChatbotAgentRunDelegate();
  if (chatbotAgentRun) {
    await chatbotAgentRun.update({
      where: { id: payload.runId },
      data: {
        planState: buildCheckpointState(payload) as InputJsonValue,
        activeStepId: payload.activeStepId,
        checkpointedAt: new Date(),
      },
    });
  }
  await logAgentAudit(payload.runId, 'info', 'Checkpoint saved.', {
    type: 'checkpoint-save',
    activeStepId: payload.activeStepId,
    stepCount: payload.steps.length,
  });
}
