import { vi, describe, it, expect, beforeEach } from "vitest";
import { initializePlanState } from "@/features/agent-runtime/execution/plan";
import * as llmPlanning from "@/features/agent-runtime/planning/llm";
import * as checkpointModule from "@/features/agent-runtime/memory/checkpoint";

vi.mock("@/features/agent-runtime/audit", () => ({
  logAgentAudit: vi.fn(),
}));

vi.mock("@/features/agent-runtime/memory/checkpoint", () => ({
  persistCheckpoint: vi.fn(),
}));

vi.mock("@/features/agent-runtime/planning/llm", () => ({
  buildPlanWithLLM: vi.fn(),
  buildResumePlanReview: vi.fn(),
}));

vi.mock("@/features/agent-runtime/planning/utils", () => ({
    decideNextAction: vi.fn().mockReturnValue({ action: "tool" }),
    buildBranchStepsFromAlternatives: vi.fn().mockReturnValue([]),
}));

describe("Agent Runtime - Plan Initialization", () => {
  const mockInput = {
    run: { id: "run-1", prompt: "Prompt" },
    checkpoint: null,
    memoryContext: [],
    browserContext: null,
    settings: { maxSteps: 10, maxStepAttempts: 3 } as any,
    preferences: {},
    plannerModel: "m1",
    loopGuardModel: "m2",
    memorySummarizationModel: "m3",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a new plan if no checkpoint exists", async () => {
    (llmPlanning.buildPlanWithLLM as any).mockResolvedValue({
      steps: [{ id: "step-1", title: "New Step" }],
      source: "llm",
      decision: { action: "tool" }
    });

    const result = await initializePlanState(mockInput);

    expect(llmPlanning.buildPlanWithLLM).toHaveBeenCalled();
    expect(checkpointModule.persistCheckpoint).toHaveBeenCalled();
    expect(result.planSteps).toHaveLength(1);
    expect(result.planSteps[0].title).toBe("New Step");
  });

  it("should resume from checkpoint if it exists", async () => {
    const inputWithCheckpoint = {
      ...mockInput,
      checkpoint: {
        steps: [{ id: "step-1", title: "Checkpoint Step" }],
        activeStepId: "step-1",
        summaryCheckpoint: 1,
      } as any,
    };

    const result = await initializePlanState(inputWithCheckpoint);

    expect(llmPlanning.buildPlanWithLLM).not.toHaveBeenCalled();
    expect(result.planSteps).toHaveLength(1);
    expect(result.planSteps[0].title).toBe("Checkpoint Step");
    expect(result.stepIndex).toBe(0);
  });

  it("should handle resume request in checkpoint", async () => {
     const inputWithResume = {
      ...mockInput,
      checkpoint: {
        steps: [{ id: "step-1", title: "Old Step" }],
        activeStepId: "step-1",
        resumeRequestedAt: "2026-01-30T10:00:00Z",
        resumeProcessedAt: null,
      } as any,
    };

    (llmPlanning.buildResumePlanReview as any).mockResolvedValue({
        shouldReplan: true,
        steps: [{ id: "new-step-1", title: "Resumed New Step" }],
        reason: "Context changed"
    });

    const result = await initializePlanState(inputWithResume);

    expect(llmPlanning.buildResumePlanReview).toHaveBeenCalled();
    expect(result.planSteps[0].title).toBe("Resumed New Step");
    expect(checkpointModule.persistCheckpoint).toHaveBeenCalledWith(expect.objectContaining({
        resumeProcessedAt: expect.any(String)
    }));
  });
});
