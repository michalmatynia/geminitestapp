import prisma from "@/lib/prisma";
import { logAgentAudit } from "@/lib/agent/audit";
import {
  addAgentMemory,
  listAgentLongTermMemory,
  listAgentMemory,
} from "@/lib/agent/memory";
import {
  DEFAULT_OLLAMA_MODEL,
  resolveAgentPlanSettings,
  resolveAgentPreferences,
} from "@/lib/agent/core/config";
import {
  buildSelfImprovementPlaybook,
  jsonValueToRecord,
} from "@/lib/agent/core/utils";
import { getBrowserContextSummary } from "@/lib/agent/browsing/context";

type AgentRunContextInput = {
  id: string;
  prompt: string;
  model: string | null;
  memoryKey: string | null;
  planState: unknown;
};

type PlannerContext = {
  memoryKey: string;
  memoryContext: string[];
  settings: ReturnType<typeof resolveAgentPlanSettings>;
  preferences: ReturnType<typeof resolveAgentPreferences>;
  resolvedModel: string;
  memoryValidationModel: string | null;
  plannerModel: string;
  selfCheckModel: string;
  loopGuardModel: string;
  approvalGateModel: string | null;
  memorySummarizationModel: string;
  browserContext: Awaited<ReturnType<typeof getBrowserContextSummary>>;
};

export async function prepareRunContext(
  run: AgentRunContextInput
): Promise<PlannerContext> {
  let memoryKey = run.memoryKey;
  if (!memoryKey) {
    memoryKey = run.id;
    await prisma.chatbotAgentRun.update({
      where: { id: run.id },
      data: { memoryKey },
    });
  }
  await addAgentMemory({
    runId: run.id,
    scope: "session",
    content: run.prompt,
    metadata: { source: "user" },
  });

  const memory = await listAgentMemory({ runId: run.id, scope: "session" });
  const sessionContext = memory.map((item) => item.content).slice(-8);
  const longTermItems = memoryKey
    ? await listAgentLongTermMemory({ memoryKey, limit: 4 })
    : [];
  const longTermProblemItems = memoryKey
    ? await listAgentLongTermMemory({
        memoryKey,
        limit: 4,
        tags: ["problem-solution"],
      })
    : [];
  const longTermImprovementItems = memoryKey
    ? await listAgentLongTermMemory({
        memoryKey,
        limit: 3,
        tags: ["self-improvement"],
      })
    : [];
  const selfImprovementPlaybook = buildSelfImprovementPlaybook(
    longTermImprovementItems.map((item) => ({
      summary: item.summary,
      content: item.content,
      metadata: jsonValueToRecord(item.metadata),
    }))
  );
  const longTermContext = [
    ...longTermItems,
    ...longTermProblemItems,
    ...longTermImprovementItems,
  ]
    .map((item) => item.summary || item.content)
    .filter(Boolean)
    .map((item) => `Long-term memory: ${item}`);
  const memoryContext = [
    ...sessionContext,
    ...longTermContext,
    ...(selfImprovementPlaybook ? [selfImprovementPlaybook] : []),
  ].slice(-10);

  const resolvedModel = run.model || DEFAULT_OLLAMA_MODEL;
  const settings = resolveAgentPlanSettings(run.planState);
  const preferences = resolveAgentPreferences(run.planState);
  const memoryValidationModel =
    typeof preferences.memoryValidationModel === "string" &&
    preferences.memoryValidationModel.trim()
      ? preferences.memoryValidationModel.trim()
      : null;
  const plannerModel =
    typeof preferences.plannerModel === "string" &&
    preferences.plannerModel.trim()
      ? preferences.plannerModel.trim()
      : resolvedModel;
  const selfCheckModel =
    typeof preferences.selfCheckModel === "string" &&
    preferences.selfCheckModel.trim()
      ? preferences.selfCheckModel.trim()
      : plannerModel;
  const loopGuardModel =
    typeof preferences.loopGuardModel === "string" &&
    preferences.loopGuardModel.trim()
      ? preferences.loopGuardModel.trim()
      : plannerModel;
  const approvalGateModel =
    typeof preferences.approvalGateModel === "string" &&
    preferences.approvalGateModel.trim()
      ? preferences.approvalGateModel.trim()
      : null;
  const memorySummarizationModel =
    typeof preferences.memorySummarizationModel === "string" &&
    preferences.memorySummarizationModel.trim()
      ? preferences.memorySummarizationModel.trim()
      : resolvedModel;
  const browserContext = await getBrowserContextSummary(run.id);

  if (longTermImprovementItems.length > 0) {
    await logAgentAudit(run.id, "info", "Self-improvement memory loaded.", {
      type: "self-improvement-context",
      count: longTermImprovementItems.length,
    });
  }
  if (selfImprovementPlaybook) {
    await logAgentAudit(run.id, "info", "Self-improvement playbook ready.", {
      type: "self-improvement-playbook",
    });
  }
  await logAgentAudit(run.id, "info", "Planner context prepared.", {
    type: "planner-context",
    reason: "initial",
    prompt: run.prompt,
    model: plannerModel,
    memory: memoryContext,
    browserContext,
  });

  return {
    memoryKey,
    memoryContext,
    settings,
    preferences,
    resolvedModel,
    memoryValidationModel,
    plannerModel,
    selfCheckModel,
    loopGuardModel,
    approvalGateModel,
    memorySummarizationModel,
    browserContext,
  };
}
