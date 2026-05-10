import { logAgentAudit } from '@/features/ai/agent-runtime/audit';
import {
  evaluateApprovalGateWithLLM,
  requiresHumanApproval as requiresHumanApprovalHeuristic,
} from '@/features/ai/agent-runtime/audit/gate';
import { getBrowserContextSummary } from '@/features/ai/agent-runtime/browsing/context';
import { buildCheckpointState } from '@/features/ai/agent-runtime/memory/checkpoint';
import { getChatbotAgentRunDelegate } from '@/features/ai/agent-runtime/store-delegates';
import { type AgentExecutionContext, type PlanStep, type PlannerMeta } from '@/shared/contracts/agent-runtime';
import type { InputJsonValue } from '@/shared/contracts/json';

const updateRunForApproval = async (args: {
  runId: string;
  step: PlanStep;
  planSteps: PlanStep[];
  lastError: string | null;
  taskType: PlannerMeta['taskType'] | null;
  approvalRequestedStepId: string | null;
  approvalGrantedStepId: string | null;
  summaryCheckpoint: number;
  context: AgentExecutionContext;
}): Promise<void> => {
  const {
    runId,
    step,
    planSteps,
    lastError,
    taskType,
    approvalRequestedStepId,
    approvalGrantedStepId,
    summaryCheckpoint,
    context,
  } = args;
  const { settings, preferences, contextRegistry } = context;

  const chatbotAgentRun = getChatbotAgentRunDelegate();
  if (chatbotAgentRun) {
    await chatbotAgentRun.update({
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
          approvalRequestedStepId,
          approvalGrantedStepId,
          summaryCheckpoint,
          settings,
          preferences,
          contextRegistry,
        }) as InputJsonValue,
        checkpointedAt: new Date(),
        logLines: {
          push: `[${new Date().toISOString()}] Approval required for step.`,
        },
      },
    });
  }
};

const evaluateApprovalHeuristicOrModel = async (args: {
  step: PlanStep;
  run: { prompt: string };
  runId: string;
  approvalGateModel: string | null | undefined;
}): Promise<{ requiresApproval: boolean; reason: string | null; risk: string | null; source: string }> => {
  const { step, run, runId, approvalGateModel } = args;
  let requiresApproval = requiresHumanApprovalHeuristic(step, run.prompt);
  let reason: string | null = null;
  let risk: string | null = null;
  let source = 'heuristic';

  if (!requiresApproval && approvalGateModel !== null && approvalGateModel !== undefined && approvalGateModel !== '') {
    const gateDecision = await evaluateApprovalGateWithLLM({
      prompt: run.prompt,
      step,
      model: approvalGateModel,
      browserContext: await getBrowserContextSummary(runId),
      runId,
    });

    if (gateDecision !== null) {
      requiresApproval = gateDecision.requiresApproval;
      reason = gateDecision.reason ?? null;
      risk = gateDecision.riskLevel ?? null;
      source = 'policy-model';
      await logAgentAudit(runId, 'info', 'Approval gate evaluated.', {
        type: 'approval-gate-review',
        stepId: step.id,
        stepTitle: step.title,
        requiresApproval,
        reason,
        riskLevel: risk,
        model: approvalGateModel,
      });
    }
  }
  return { requiresApproval, reason, risk, source };
};

interface ApprovalResult {
  requiresApproval: boolean;
  requiresHuman: boolean;
  approvalSource: string;
  approvalReason: string | null;
  approvalRisk: string | null;
  updatedApprovalRequestedStepId: string | null;
}

const buildApprovalResult = (args: {
  requiresApproval: boolean;
  source: string;
  reason: string | null;
  risk: string | null;
  updatedApprovalRequestedStepId: string | null;
}): ApprovalResult => {
  return {
    requiresApproval: args.requiresApproval,
    requiresHuman: args.requiresApproval,
    approvalSource: args.source,
    approvalReason: args.reason,
    approvalRisk: args.risk,
    updatedApprovalRequestedStepId: args.updatedApprovalRequestedStepId,
  };
};

export interface EvaluateApprovalArgs {
  step: PlanStep;
  context: AgentExecutionContext;
  runId: string;
  approvalGrantedStepId: string | null;
  planSteps: PlanStep[];
  lastError: string | null;
  taskType: PlannerMeta['taskType'] | null;
  approvalRequestedStepId: string | null;
  summaryCheckpoint: number;
}

export async function evaluateApproval(args: EvaluateApprovalArgs): Promise<ApprovalResult> {
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

  const { preferences, approvalGateModel, run } = context;
  const shouldCheckApproval = Boolean(preferences.requireHumanApproval) && approvalGrantedStepId !== step.id;

  if (shouldCheckApproval) {
    const { requiresApproval, reason, risk, source } = await evaluateApprovalHeuristicOrModel({
      step,
      run,
      runId,
      approvalGateModel,
    });

    if (requiresApproval) {
      const nextApprovalRequestedStepId = step.id;
      await updateRunForApproval({
        runId,
        step,
        planSteps,
        lastError,
        taskType,
        approvalRequestedStepId: nextApprovalRequestedStepId,
        approvalGrantedStepId,
        summaryCheckpoint,
        context,
      });

      await logAgentAudit(runId, 'warning', 'Approval required.', {
        type: 'approval-gate',
        stepId: step.id,
        stepTitle: step.title,
        source,
        reason,
        riskLevel: risk,
      });

      return buildApprovalResult({ 
        requiresApproval: true, 
        source, 
        reason, 
        risk, 
        updatedApprovalRequestedStepId: nextApprovalRequestedStepId 
      });
    }
  }

  return buildApprovalResult({ 
    requiresApproval: false, 
    source: 'none', 
    reason: null, 
    risk: null, 
    updatedApprovalRequestedStepId: approvalRequestedStepId 
  });
}
