import { logAgentAudit } from "@/lib/agent/audit";
import type {
  AgentDecision,
  AgentPlanSettings,
  PlanStep,
  PlannerMeta,
} from "@/lib/agent/engine-types";
import {
  buildBranchStepsFromAlternatives,
  decideNextAction,
} from "@/lib/agent/engine-plan-utils";
import {
  buildPlanWithLLM,
  buildResumePlanReview,
} from "@/lib/agent/engine-plan-llm";
import { getBrowserContextSummary } from "@/lib/agent/engine-browser-context";
import { persistCheckpoint } from "@/lib/agent/engine-checkpoint";
import type { PlanHierarchy } from "@/lib/agent/engine-plan-utils";

type CheckpointState = ReturnType<
  typeof import("@/lib/agent/engine-checkpoint").parseCheckpoint
>;

type PlanInitializationResult = {
  planSteps: PlanStep[];
  planHierarchy: PlanHierarchy | null;
  taskType: PlannerMeta["taskType"] | null;
  decision: AgentDecision;
  stepIndex: number;
  summaryCheckpoint: number;
  preferences: Record<string, unknown>;
};

type InitializePlanInput = {
  run: { id: string; prompt: string };
  checkpoint: CheckpointState;
  memoryContext: string[];
  browserContext: Awaited<ReturnType<typeof getBrowserContextSummary>>;
  settings: AgentPlanSettings;
  preferences: Record<string, unknown>;
  plannerModel: string;
  loopGuardModel: string;
  memorySummarizationModel: string;
};

export async function initializePlanState(
  input: InitializePlanInput
): Promise<PlanInitializationResult> {
  const {
    run,
    checkpoint,
    memoryContext,
    browserContext,
    settings,
    preferences,
    plannerModel,
    loopGuardModel,
    memorySummarizationModel,
  } = input;

  let planSteps: PlanStep[] = [];
  let planHierarchy: PlanHierarchy | null = null;
  let taskType: PlannerMeta["taskType"] | null = null;
  let decision: AgentDecision = decideNextAction(run.prompt, memoryContext);
  let stepIndex = 0;
  let summaryCheckpoint = checkpoint?.summaryCheckpoint ?? 0;
  const nextPreferences = { ...preferences };

  if (checkpoint?.steps?.length) {
    planSteps = checkpoint.steps;
    taskType = checkpoint.taskType ?? null;
    const checkpointPreferences = checkpoint.preferences ?? null;
    if (checkpointPreferences?.ignoreRobotsTxt !== undefined) {
      nextPreferences.ignoreRobotsTxt = Boolean(
        checkpointPreferences.ignoreRobotsTxt
      );
    }
    if (checkpointPreferences?.requireHumanApproval !== undefined) {
      nextPreferences.requireHumanApproval = Boolean(
        checkpointPreferences.requireHumanApproval
      );
    }
    if (typeof checkpointPreferences?.plannerModel === "string") {
      nextPreferences.plannerModel = checkpointPreferences.plannerModel;
    }
    if (typeof checkpointPreferences?.selfCheckModel === "string") {
      nextPreferences.selfCheckModel = checkpointPreferences.selfCheckModel;
    }
    if (typeof checkpointPreferences?.loopGuardModel === "string") {
      nextPreferences.loopGuardModel = checkpointPreferences.loopGuardModel;
    }
    if (typeof checkpointPreferences?.approvalGateModel === "string") {
      nextPreferences.approvalGateModel = checkpointPreferences.approvalGateModel;
    }
    if (typeof checkpointPreferences?.memorySummarizationModel === "string") {
      nextPreferences.memorySummarizationModel =
        checkpointPreferences.memorySummarizationModel;
    }
    if (typeof checkpoint.summaryCheckpoint === "number") {
      summaryCheckpoint = checkpoint.summaryCheckpoint;
    }
    let resumedWithNewPlan = false;
    if (
      checkpoint.resumeRequestedAt &&
      checkpoint.resumeRequestedAt !== checkpoint.resumeProcessedAt
    ) {
      const resumeContext = await getBrowserContextSummary(run.id);
      const resumeReview = await buildResumePlanReview({
        prompt: run.prompt,
        memory: memoryContext,
        model: memorySummarizationModel,
        browserContext: resumeContext,
        currentPlan: planSteps,
        completedIndex: Math.max(stepIndex, 0),
        lastError: checkpoint.lastError ?? null,
        runId: run.id,
        maxSteps: settings.maxSteps,
        maxStepAttempts: settings.maxStepAttempts,
      });
      if (resumeReview.shouldReplan && resumeReview.steps.length > 0) {
        planSteps = resumeReview.steps;
        stepIndex = 0;
        resumedWithNewPlan = true;
        taskType = resumeReview.meta?.taskType ?? taskType;
        await logAgentAudit(run.id, "warning", "Resume plan refreshed.", {
          type: "resume-plan",
          steps: planSteps,
          reason: resumeReview.reason,
          plannerMeta: resumeReview.meta ?? null,
          hierarchy: resumeReview.hierarchy ?? null,
        });
      } else {
        await logAgentAudit(run.id, "info", "Resume summary prepared.", {
          type: "resume-summary",
          summary: resumeReview.summary ?? null,
          reason: resumeReview.reason,
          plannerMeta: resumeReview.meta ?? null,
        });
      }
      await persistCheckpoint({
        runId: run.id,
        steps: planSteps,
        activeStepId: planSteps[stepIndex]?.id ?? null,
        lastError: checkpoint.lastError ?? null,
        taskType,
        resumeRequestedAt: checkpoint.resumeRequestedAt,
        resumeProcessedAt: new Date().toISOString(),
        approvalRequestedStepId: checkpoint.approvalRequestedStepId ?? null,
        approvalGrantedStepId: checkpoint.approvalGrantedStepId ?? null,
        summaryCheckpoint,
        settings,
        preferences: nextPreferences,
      });
    }
    if (!resumedWithNewPlan && checkpoint.activeStepId) {
      const activeIndex = planSteps.findIndex(
        (step) => step.id === checkpoint.activeStepId
      );
      stepIndex = activeIndex === -1 ? 0 : activeIndex;
    } else {
      const firstPending = planSteps.findIndex(
        (step) => step.status !== "completed"
      );
      stepIndex = firstPending === -1 ? 0 : firstPending;
    }
    decision = {
      action: "tool",
      reason: "Resuming from checkpoint.",
      toolName: "playwright",
    };
    await logAgentAudit(run.id, "info", "Checkpoint loaded.", {
      type: "checkpoint-load",
      activeStepId: checkpoint.activeStepId ?? null,
      stepCount: planSteps.length,
    });
  } else {
    const planResult = await buildPlanWithLLM({
      prompt: run.prompt,
      memory: memoryContext,
      model: plannerModel,
      guardModel: loopGuardModel,
      browserContext,
      maxSteps: settings.maxSteps,
      maxStepAttempts: settings.maxStepAttempts,
    });

    planSteps = planResult.steps;
    planHierarchy = planResult.hierarchy ?? null;
    taskType = planResult.meta?.taskType ?? null;
    if (planSteps.length > 0) {
      await logAgentAudit(run.id, "info", "Plan created.", {
        type: "plan",
        steps: planSteps,
        source: planResult.source,
        hierarchy: planHierarchy,
        plannerMeta: planResult.meta ?? null,
      });
      const branchAlternatives = buildBranchStepsFromAlternatives(
        planResult.meta?.alternatives ?? undefined,
        settings.maxStepAttempts,
        Math.min(6, settings.maxSteps)
      );
      if (branchAlternatives.length > 0) {
        await logAgentAudit(run.id, "info", "Plan branch created.", {
          type: "plan-branch",
          branchSteps: branchAlternatives,
          reason: "planner-alternatives",
          plannerMeta: planResult.meta ?? null,
        });
      }
    }
    decision = planResult.decision;
    await persistCheckpoint({
      runId: run.id,
      steps: planSteps,
      activeStepId: planSteps[0]?.id ?? null,
      lastError: null,
      taskType,
      summaryCheckpoint,
      approvalRequestedStepId: null,
      approvalGrantedStepId: null,
      settings,
      preferences: nextPreferences,
    });
  }

  return {
    planSteps,
    planHierarchy,
    taskType,
    decision,
    stepIndex,
    summaryCheckpoint,
    preferences: nextPreferences,
  };
}
