import { vi, describe, it, expect, beforeEach } from "vitest";
import prisma from "@/shared/lib/db/prisma";
import { finalizeAgentRun } from "@/features/ai/agent-runtime/execution/finalize";
import * as llmPlanning from "@/features/ai/agent-runtime/planning/llm";
import * as browserContextModule from "@/features/ai/agent-runtime/browsing/context";

vi.mock("@/shared/lib/db/prisma", () => ({
  default: {
    chatbotAgentRun: { update: vi.fn() },
  },
}));

vi.mock("@/features/ai/agent-runtime/audit", () => ({
  logAgentAudit: vi.fn(),
}));

vi.mock("@/features/ai/agent-runtime/memory", () => ({
  addAgentMemory: vi.fn(),
}));

vi.mock("@/features/ai/agent-runtime/memory/checkpoint", () => ({
  buildCheckpointState: vi.fn().mockReturnValue({}),
}));

vi.mock("@/features/ai/agent-runtime/planning/llm", () => ({
  verifyPlanWithLLM: vi.fn(),
  buildSelfImprovementReviewWithLLM: vi.fn(),
}));

vi.mock("@/features/ai/agent-runtime/browsing/context", () => ({
  getBrowserContextSummary: vi.fn(),
}));

describe("Agent Runtime - Finalize", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should finalize run and call LLM reviews", async () => {
    const input = {
      run: { id: "run-1", prompt: "Prompt" },
      planSteps: [],
      taskType: "web_task" as const,
      overallOk: true,
      requiresHuman: false,
      lastError: null,
      summaryCheckpoint: 0,
      settings: {} as any,
      preferences: {} as any,
      memoryContext: [],
      plannerModel: "m1",
      memorySummarizationModel: "m2",
    };

    (browserContextModule.getBrowserContextSummary as any).mockResolvedValue({ url: "http://test.com" });
    (llmPlanning.verifyPlanWithLLM as any).mockResolvedValue({ verdict: "pass" });
    (llmPlanning.buildSelfImprovementReviewWithLLM as any).mockResolvedValue({
        summary: "Good",
        mistakes: [],
        improvements: ["Better"],
        guardrails: [],
        toolAdjustments: [],
        confidence: 90
    });

    const result = await finalizeAgentRun(input);

    expect(prisma.chatbotAgentRun.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "run-1" },
      data: expect.objectContaining({ status: "completed" })
    }));
    expect(llmPlanning.verifyPlanWithLLM).toHaveBeenCalled();
    expect(llmPlanning.buildSelfImprovementReviewWithLLM).toHaveBeenCalled();
    expect(result.verification?.verdict).toBe("pass");
  });
});
