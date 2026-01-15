import prisma from "@/lib/prisma";
import { logAgentAudit } from "@/lib/agent/audit";
import { addAgentMemory } from "@/lib/agent/memory";
import { buildCheckpointState } from "@/lib/agent/memory/checkpoint";
import {
  buildSelfImprovementReviewWithLLM,
  verifyPlanWithLLM,
} from "@/lib/agent/planning/llm";
import { getBrowserContextSummary } from "@/lib/agent/browsing/context";
import type {
  AgentPlanPreferences,
  AgentPlanSettings,
  PlanStep,
  PlannerMeta,
} from "@/types/agent";

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

export async function finalizeAgentRun(input: FinalizeRunInput) {
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

  await prisma.chatbotAgentRun.update({
    where: { id: run.id },
    data: {
      status: overallOk
        ? "completed"
        : requiresHuman
          ? "waiting_human"
          : "failed",
      requiresHumanIntervention: requiresHuman,
      finishedAt: new Date(),
      errorMessage: overallOk ? null : lastError,
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
        push: `[${new Date().toISOString()}] Playwright tool ${overallOk ? "completed" : "failed"}.`,
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
    taskType,
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
