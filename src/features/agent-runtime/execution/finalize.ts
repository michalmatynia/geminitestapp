import prisma from "@/shared/lib/db/prisma";
import { logAgentAudit } from "@/features/agent-runtime/audit";
import { addAgentMemory } from "@/features/agent-runtime/memory";
import { buildCheckpointState } from "@/features/agent-runtime/memory/checkpoint";
import {
  buildSelfImprovementReviewWithLLM,
  verifyPlanWithLLM,
} from "@/features/agent-runtime/planning/llm";
import { getBrowserContextSummary } from "@/features/agent-runtime/browsing/context";
import type {
  AgentPlanPreferences,
  AgentPlanSettings,
  PlanStep,
  PlannerMeta,
} from "@/features/agent-runtime/types/agent";

type FinalizeRunInput = {
  run: {
    id: string;
    prompt: string;
  };
  planSteps: PlanStep[];
  taskType: PlannerMeta["taskType"] | null;
  overallOk: boolean;
  requiresHuman: boolean;
  lastError: string | null;
  summaryCheckpoint: number;
  settings: AgentPlanSettings;
  preferences: AgentPlanPreferences;
  memoryContext: string[];
  plannerModel: string;
  memorySummarizationModel: string;
};

export async function finalizeAgentRun(input: FinalizeRunInput): Promise<{
  verificationContext: Awaited<ReturnType<typeof getBrowserContextSummary>>;
  verification: Awaited<ReturnType<typeof verifyPlanWithLLM>>;
  improvementReview: Awaited<ReturnType<typeof buildSelfImprovementReviewWithLLM>>;
}> {
  const {
    run,
    planSteps,
    taskType,
    overallOk,
    requiresHuman,
    lastError,
    summaryCheckpoint,
    settings,
    preferences,
    memoryContext,
    plannerModel,
    memorySummarizationModel,
  } = input;
  const status = requiresHuman ? "waiting_human" : overallOk ? "completed" : "failed";

  await prisma.chatbotAgentRun.update({
    where: { id: run.id },
    data: {
      status,
      requiresHumanIntervention: requiresHuman,
      finishedAt: new Date(),
      errorMessage: status === "failed" ? lastError : null,
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
      }),
      checkpointedAt: new Date(),
      logLines: {
        push: `[${new Date().toISOString()}] Playwright tool ${
          status === "completed" ? "completed" : status === "waiting_human" ? "paused" : "failed"
        }.`,
      },
    },
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
    await logAgentAudit(run.id, "info", "Self-improvement review completed.", {
      type: "self-improvement",
      summary: improvementReview.summary,
      mistakes: improvementReview.mistakes,
      improvements: improvementReview.improvements,
      guardrails: improvementReview.guardrails,
      toolAdjustments: improvementReview.toolAdjustments,
      confidence: improvementReview.confidence,
    });
    await addAgentMemory({
      runId: run.id,
      scope: "session",
      content: [
        "Self-improvement review",
        improvementReview.summary,
        improvementReview.mistakes.length
          ? `Mistakes: ${improvementReview.mistakes.join(" | ")}`
          : null,
        improvementReview.improvements.length
          ? `Improvements: ${improvementReview.improvements.join(" | ")}`
          : null,
        improvementReview.guardrails.length
          ? `Guardrails: ${improvementReview.guardrails.join(" | ")}`
          : null,
        improvementReview.toolAdjustments.length
          ? `Tool adjustments: ${improvementReview.toolAdjustments.join(" | ")}`
          : null,
      ]
        .filter(Boolean)
        .join("\n"),
      metadata: { type: "self-improvement", confidence: improvementReview.confidence ?? null },
    });
  }

  return { verificationContext, verification, improvementReview };
}
