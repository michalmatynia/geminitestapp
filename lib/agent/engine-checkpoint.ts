import prisma from "@/lib/prisma";
import { logAgentAudit } from "@/lib/agent/audit";
import type {
  AgentCheckpoint,
  AgentPlanPreferences,
  AgentPlanSettings,
  PlanStep,
  PlannerMeta,
} from "@/lib/agent/engine-types";

export function parseCheckpoint(payload: unknown): AgentCheckpoint | null {
  if (!payload || typeof payload !== "object") return null;
  const raw = payload as Partial<AgentCheckpoint>;
  if (!Array.isArray(raw.steps)) return null;
  return {
    steps: raw.steps,
    activeStepId: raw.activeStepId ?? null,
    lastError: raw.lastError ?? null,
    taskType: raw.taskType ?? null,
    resumeRequestedAt: raw.resumeRequestedAt ?? null,
    resumeProcessedAt: raw.resumeProcessedAt ?? null,
    approvalRequestedStepId:
      typeof raw.approvalRequestedStepId === "string"
        ? raw.approvalRequestedStepId
        : null,
    approvalGrantedStepId:
      typeof raw.approvalGrantedStepId === "string"
        ? raw.approvalGrantedStepId
        : null,
    checkpointBrief:
      typeof raw.checkpointBrief === "string" ? raw.checkpointBrief : null,
    checkpointNextActions: Array.isArray(raw.checkpointNextActions)
      ? raw.checkpointNextActions
      : null,
    checkpointRisks: Array.isArray(raw.checkpointRisks)
      ? raw.checkpointRisks
      : null,
    checkpointStepId:
      typeof raw.checkpointStepId === "string" ? raw.checkpointStepId : null,
    checkpointCreatedAt:
      typeof raw.checkpointCreatedAt === "string"
        ? raw.checkpointCreatedAt
        : null,
    summaryCheckpoint:
      typeof raw.summaryCheckpoint === "number" ? raw.summaryCheckpoint : null,
    settings: raw.settings ?? null,
    preferences: raw.preferences ?? null,
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
  };
}

export function buildCheckpointState(payload: {
  steps: PlanStep[];
  activeStepId: string | null;
  lastError?: string | null;
  taskType?: PlannerMeta["taskType"] | null;
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
}) {
  return {
    steps: payload.steps,
    activeStepId: payload.activeStepId,
    lastError: payload.lastError ?? null,
    taskType: payload.taskType ?? null,
    resumeRequestedAt: payload.resumeRequestedAt ?? null,
    resumeProcessedAt: payload.resumeProcessedAt ?? null,
    approvalRequestedStepId: payload.approvalRequestedStepId ?? null,
    approvalGrantedStepId: payload.approvalGrantedStepId ?? null,
    checkpointBrief: payload.checkpointBrief ?? null,
    checkpointNextActions: payload.checkpointNextActions ?? null,
    checkpointRisks: payload.checkpointRisks ?? null,
    checkpointStepId: payload.checkpointStepId ?? null,
    checkpointCreatedAt: payload.checkpointCreatedAt ?? null,
    summaryCheckpoint: payload.summaryCheckpoint ?? null,
    settings: payload.settings ?? null,
    preferences: payload.preferences ?? null,
    updatedAt: new Date().toISOString(),
  };
}

export async function persistCheckpoint(payload: {
  runId: string;
  steps: PlanStep[];
  activeStepId: string | null;
  lastError?: string | null;
  taskType?: PlannerMeta["taskType"] | null;
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
}) {
  await prisma.chatbotAgentRun.update({
    where: { id: payload.runId },
    data: {
      planState: buildCheckpointState(payload),
      activeStepId: payload.activeStepId,
      checkpointedAt: new Date(),
    },
  });
  await logAgentAudit(payload.runId, "info", "Checkpoint saved.", {
    type: "checkpoint-save",
    activeStepId: payload.activeStepId,
    stepCount: payload.steps.length,
  });
}
