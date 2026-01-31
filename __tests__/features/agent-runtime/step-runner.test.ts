import { vi, describe, it, expect, beforeEach } from "vitest";
import prisma from "@/shared/lib/db/prisma";
import { runPlanStepLoop } from "@/features/agent-runtime/execution/step-runner";
import * as toolsModule from "@/features/agent-runtime/tools/index";
import * as llmPlanning from "@/features/agent-runtime/planning/llm";
import * as auditGate from "@/features/agent-runtime/audit/gate";

vi.mock("@/shared/lib/db/prisma", () => ({
  default: {
    chatbotAgentRun: { update: vi.fn() },
    agentBrowserLog: { create: vi.fn() },
    agentBrowserSnapshot: { findFirst: vi.fn() },
    agentAuditLog: { create: vi.fn(), findFirst: vi.fn() },
  },
}));

vi.mock("@/features/agent-runtime/audit", () => ({
  logAgentAudit: vi.fn(),
}));

vi.mock("@/features/agent-runtime/memory", () => ({
  addAgentMemory: vi.fn(),
  validateAndAddAgentLongTermMemory: vi.fn().mockResolvedValue({ valid: true }),
}));

vi.mock("@/features/agent-runtime/memory/checkpoint", () => ({
  persistCheckpoint: vi.fn().mockResolvedValue(undefined),
  buildCheckpointState: vi.fn().mockReturnValue({}),
}));

vi.mock("@/features/agent-runtime/tools/index", () => ({
  runAgentTool: vi.fn(),
  runAgentBrowserControl: vi.fn().mockResolvedValue({ ok: true, output: { snapshotId: "snap-2" } }),
}));

vi.mock("@/features/agent-runtime/planning/llm", () => ({
  buildPlanWithLLM: vi.fn(),
  buildAdaptivePlanReview: vi.fn().mockResolvedValue({ shouldReplan: false }),
  buildCheckpointBriefWithLLM: vi.fn(),
  buildMidRunAdaptationWithLLM: vi.fn().mockResolvedValue({ shouldAdapt: false }),
  buildSelfCheckReview: vi.fn().mockResolvedValue({ action: "continue" }),
  guardRepetitionWithLLM: vi.fn().mockImplementation(({ candidateSteps }) => candidateSteps),
  summarizePlannerMemoryWithLLM: vi.fn(),
}));

vi.mock("@/features/agent-runtime/browsing/context", () => ({
  getBrowserContextSummary: vi.fn().mockResolvedValue({ url: "http://test.com" }),
}));

vi.mock("@/features/agent-runtime/audit/gate", () => ({
  requiresHumanApproval: vi.fn().mockReturnValue(false),
  evaluateApprovalGateWithLLM: vi.fn(),
}));

vi.mock("@/features/agent-runtime/execution/loop-guard", () => ({
  detectLoopPattern: vi.fn().mockReturnValue(null),
  buildLoopGuardReview: vi.fn(),
}));

describe("Agent Runtime - Step Runner", () => {
  const mockInput = {
    run: { id: "run-1", prompt: "Prompt" },
    sharedBrowser: null,
    sharedContext: null,
    planSteps: [
      { id: "step-1", title: "Step 1", tool: "playwright" as const, status: "pending" as const },
      { id: "step-2", title: "Step 2", tool: "playwright" as const, status: "pending" as const },
    ],
    stepIndex: 0,
    taskType: "web_task" as const,
    settings: { maxSteps: 10, maxStepAttempts: 3, loopGuardThreshold: 1, maxReplanCalls: 3, maxSelfChecks: 3, replanEverySteps: 5 } as any,
    preferences: { requireHumanApproval: false } as any,
    memoryContext: [],
    summaryCheckpoint: 0,
    memoryKey: "mem-1",
    memoryValidationModel: null,
    memorySummarizationModel: "m1",
    plannerModel: "m2",
    selfCheckModel: "m3",
    loopGuardModel: "m4",
    approvalGateModel: null,
    resolvedModel: "m5",
    browserContext: { url: "http://test.com" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should run steps until completion", async () => {
    (toolsModule.runAgentTool as any).mockResolvedValue({
      ok: true,
      output: { url: "http://example.com", snapshotId: "snap-1" }
    });

    const result = await runPlanStepLoop(mockInput);

    expect(result.stepIndex).toBe(2);
    expect(result.overallOk).toBe(true);
  });

  it("should stop and return if approval is required", async () => {
    const inputWithApproval = {
      ...mockInput,
      preferences: { requireHumanApproval: true } as any,
    };
    (auditGate.requiresHumanApproval as any).mockReturnValue(true);

    const result = await runPlanStepLoop(inputWithApproval);

    expect(result.stepIndex).toBe(0);
    expect(prisma.chatbotAgentRun.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: "waiting_human" })
    }));
  });

  it("should handle tool failure and attempt replan", async () => {
    (toolsModule.runAgentTool as any).mockResolvedValue({
      ok: false,
      error: "Element not found"
    });
    
    (llmPlanning.buildPlanWithLLM as any).mockResolvedValue({
        branchSteps: [{ id: "new-step", title: "Recovery Step", tool: "playwright", status: "pending" }],
        meta: { taskType: "web_task" },
        source: "llm"
    });

    const result = await runPlanStepLoop(mockInput);

    expect(llmPlanning.buildPlanWithLLM).toHaveBeenCalled();
    expect(result.planSteps).toContainEqual(expect.objectContaining({ title: "Recovery Step" }));
  });

  it("should detect loops and trigger loop guard", async () => {
      const loopGuardModule = await import("@/features/agent-runtime/execution/loop-guard");
      (loopGuardModule.detectLoopPattern as any).mockReturnValue({ pattern: "repeat-same-step", reason: "Repeat" });
      (loopGuardModule.buildLoopGuardReview as any).mockResolvedValue({
          action: "replan",
          steps: [{ id: "loop-fix", title: "Fix Loop", tool: "playwright", status: "pending" }],
          meta: { taskType: "web_task" }
      });
      (toolsModule.runAgentTool as any).mockResolvedValue({ ok: true, output: { url: "http://a.com", snapshotId: "snap-1" } });

      const result = await runPlanStepLoop(mockInput);
      
      expect(loopGuardModule.buildLoopGuardReview).toHaveBeenCalled();
      expect(result.planSteps).toContainEqual(expect.objectContaining({ title: "Fix Loop" }));
  });
});