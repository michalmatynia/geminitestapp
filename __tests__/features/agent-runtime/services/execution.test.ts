import { vi, describe, it, expect, beforeEach } from "vitest";
import prisma from "@/shared/lib/db/prisma";
import { prepareRunContext } from "@/features/agent-runtime/execution/context";
import { detectLoopPattern, buildLoopGuardReview } from "@/features/agent-runtime/execution/loop-guard";
import { resolveAgentPlanSettings, resolveAgentPreferences } from "@/features/agent-runtime/core/config";
import { getBrowserContextSummary } from "@/features/agent-runtime/browsing/context";

// Mock external modules
vi.mock("@/shared/lib/db/prisma", () => ({
  default: {
    chatbotAgentRun: { update: vi.fn() },
    agentAuditLog: { create: vi.fn() },
    agentMemoryItem: { create: vi.fn(), findMany: vi.fn() },
    agentLongTermMemory: { findMany: vi.fn() },
  },
}));

vi.mock("@/features/agent-runtime/audit", () => ({
  logAgentAudit: vi.fn(),
}));

vi.mock("@/features/agent-runtime/memory", () => ({
  addAgentMemory: vi.fn(),
  listAgentMemory: vi.fn(),
  listAgentLongTermMemory: vi.fn(),
}));

vi.mock("@/features/agent-runtime/core/config", () => ({
  DEFAULT_OLLAMA_MODEL: "llama3",
  DEBUG_CHATBOT: false,
  OLLAMA_BASE_URL: "http://localhost:11434",
  resolveAgentPlanSettings: vi.fn(),
  resolveAgentPreferences: vi.fn(),
}));

vi.mock("@/features/agent-runtime/browsing/context", () => ({
  getBrowserContextSummary: vi.fn(),
}));

vi.mock("@/features/agent-runtime/core/utils", () => ({
  buildSelfImprovementPlaybook: vi.fn().mockReturnValue(null),
  jsonValueToRecord: vi.fn((val) => val),
}));

describe("Agent Runtime - Execution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe("context.ts - prepareRunContext", () => {
    it("should prepare run context correctly", async () => {
      // Setup mocks
      (resolveAgentPlanSettings as any).mockReturnValue({});
      (resolveAgentPreferences as any).mockReturnValue({
        plannerModel: "planner-v1",
      });
      (getBrowserContextSummary as any).mockResolvedValue({ url: "about:blank" });
      
      const mockMemory = [{ content: "Session 1" }, { content: "Session 2" }];
// Mock browser module
      const { listAgentMemory, listAgentLongTermMemory } = await import("@/features/agent-runtime/memory");
      (listAgentMemory as any).mockResolvedValue(mockMemory);
      (listAgentLongTermMemory as any).mockResolvedValue([]);

      const result = await prepareRunContext({
        id: "run-1",
        prompt: "Do something",
        model: null,
        memoryKey: null,
        planState: {},
      });

      expect(prisma.chatbotAgentRun.update).toHaveBeenCalledWith({
        where: { id: "run-1" },
        data: { memoryKey: "run-1" }, // Should generate key if missing
      });
      expect(result.resolvedModel).toBe("llama3");
      expect(result.plannerModel).toBe("planner-v1");
      expect(result.browserContext).toEqual({ url: "about:blank" });
    });
  });

  describe("loop-guard.ts - detectLoopPattern", () => {
    it("should detect repeating the same step", () => {
      const history = [
        { title: "Click A", status: "completed" as const, url: "http://a.com" },
        { title: "Click A", status: "completed" as const, url: "http://a.com" },
        { title: "Click A", status: "completed" as const, url: "http://a.com" },
      ];
      const result = detectLoopPattern(history);
      expect(result).not.toBeNull();
      expect(result?.pattern).toBe("repeat-same-step");
    });

    it("should detect alternating steps", () => {
      const history = [
        { title: "Click A", status: "completed" as const, url: "http://a.com" },
        { title: "Click B", status: "completed" as const, url: "http://a.com" },
        { title: "Click A", status: "completed" as const, url: "http://a.com" },
        { title: "Click B", status: "completed" as const, url: "http://a.com" },
      ];
      const result = detectLoopPattern(history);
      expect(result).not.toBeNull();
      expect(result?.pattern).toBe("alternate-two-steps");
    });

    it("should return null for no loop", () => {
      const history = [
        { title: "Click A", status: "completed" as const, url: "http://a.com" },
        { title: "Click B", status: "completed" as const, url: "http://a.com" },
        { title: "Click C", status: "completed" as const, url: "http://a.com" },
      ];
      const result = detectLoopPattern(history);
      expect(result).toBeNull();
    });
  });

  describe("loop-guard.ts - buildLoopGuardReview", () => {
    it("should call LLM and parse response", async () => {
       const mockResponse = {
        message: {
          content: JSON.stringify({
            action: "replan",
            reason: "Loop detected",
            steps: [{ title: "New Step" }],
          }),
        },
      };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => await Promise.resolve(mockResponse),
      });

      const result = await buildLoopGuardReview({
        prompt: "Task",
        memory: [],
        model: "llama3",
        currentPlan: [],
        completedIndex: 0,
        loopSignal: { pattern: "repeat-same-step", reason: "Repeat", titles: [], urls: [], statuses: [] },
        maxSteps: 10,
        maxStepAttempts: 3
      });

      expect(result.action).toBe("replan");
      expect(result.steps).toHaveLength(1);
      expect(result.steps[0]?.title).toBe("New Step");
    });
    
    it("should fallback on LLM failure", async () => {
      (global.fetch as any).mockRejectedValue(new Error("LLM Fail"));
      
      const result = await buildLoopGuardReview({
        prompt: "Task",
        memory: [],
        model: "llama3",
        currentPlan: [],
        completedIndex: 0,
        loopSignal: { pattern: "repeat-same-step", reason: "Repeat", titles: [], urls: [], statuses: [] },
        maxSteps: 10,
        maxStepAttempts: 3
      });

      expect(result.action).toBe("continue");
      expect(result.steps).toHaveLength(0);
    });
  });
});
