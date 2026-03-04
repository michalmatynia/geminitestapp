import { logAgentAudit } from '@/features/ai/agent-runtime/audit';
import {
  evaluateApprovalGateWithLLM,
  requiresHumanApproval as requiresHumanApprovalHeuristic,
} from '@/features/ai/agent-runtime/audit/gate';
import { getBrowserContextSummary } from '@/features/ai/agent-runtime/browsing/context';
import { buildCheckpointState } from '@/features/ai/agent-runtime/memory/checkpoint';
import { AgentExecutionContext, PlanStep, PlannerMeta } from '@/shared/contracts/agent-runtime';
import prisma from '@/shared/lib/db/prisma';

export async function evaluateApproval(args: {
  step: PlanStep;
  context: AgentExecutionContext;
  runId: string;
  approvalGrantedStepId: string | null;
  planSteps: PlanStep[];
  lastError: string | null;
  taskType: PlannerMeta['taskType'] | null;
  approvalRequestedStepId: string | null;
  summaryCheckpoint: number;
}): Promise<{
  requiresApproval: boolean;
  requiresHuman: boolean;
  approvalSource: string;
  approvalReason: string | null;
  approvalRisk: string | null;
  updatedApprovalRequestedStepId: string | null;
}> {
  const {
    step,
    context,
    runId,
    approvalGrantedStepId,
    planSteps,
    lastError,
    taskType,
    approvalRequestedStepId,
    summaryCheckpoint,
  } = args;

  const { preferences, approvalGateModel, run, settings } = context;

  let requiresApproval = false;
  let approvalReason: string | null = null;
  let approvalRisk: string | null = null;
  let approvalSource = 'heuristic';

  if (preferences.requireHumanApproval && approvalGrantedStepId !== step.id) {
    requiresApproval = requiresHumanApprovalHeuristic(step, run.prompt);
    if (!requiresApproval && approvalGateModel) {
      const gateContext = await getBrowserContextSummary(runId);
      const gateDecision = await evaluateApprovalGateWithLLM({
        prompt: run.prompt,
        step,
        model: approvalGateModel,
        browserContext: gateContext,
        runId,
      });
      if (gateDecision) {
        requiresApproval = gateDecision.requiresApproval;
        approvalReason = gateDecision.reason ?? null;
        approvalRisk = gateDecision.riskLevel ?? null;
        approvalSource = 'policy-model';
        await logAgentAudit(runId, 'info', 'Approval gate evaluated.', {
          type: 'approval-gate-review',
          stepId: step.id,
          stepTitle: step.title,
          requiresApproval,
          reason: approvalReason,
          riskLevel: approvalRisk,
          model: approvalGateModel,
        });
      }
    }
  }

  let nextApprovalRequestedStepId = approvalRequestedStepId;

  if (preferences.requireHumanApproval && requiresApproval && approvalGrantedStepId !== step.id) {
    nextApprovalRequestedStepId = step.id;
    await prisma.chatbotAgentRun.update({
      where: { id: runId },
      data: {
        status: 'waiting_human',
        requiresHumanIntervention: true,
        activeStepId: step.id,
        planState: buildCheckpointState({
          steps: planSteps,
          activeStepId: step.id,
          lastError,
          taskType,
          approvalRequestedStepId: nextApprovalRequestedStepId,
          approvalGrantedStepId,
          summaryCheckpoint,
          settings,
          preferences,
        }),
        checkpointedAt: new Date(),
        logLines: {
          push: `[${new Date().toISOString()}] Approval required for step.`,
        },
      },
    });
    await logAgentAudit(runId, 'warning', 'Approval required.', {
      type: 'approval-gate',
      stepId: step.id,
      stepTitle: step.title,
      source: approvalSource,
      reason: approvalReason,
      riskLevel: approvalRisk,
    });
    return {
      requiresApproval: true,
      requiresHuman: true,
      approvalSource,
      approvalReason,
      approvalRisk,
      updatedApprovalRequestedStepId: nextApprovalRequestedStepId,
    };
  }

  return {
    requiresApproval: false,
    requiresHuman: false,
    approvalSource,
    approvalReason,
    approvalRisk,
    updatedApprovalRequestedStepId: nextApprovalRequestedStepId,
  };
}
