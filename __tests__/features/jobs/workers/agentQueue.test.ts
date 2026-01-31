import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("crypto")>();
  return {
    ...actual,
    randomUUID: () => "mock-uuid",
  };
});

import { processAgentQueue, stopAgentQueue } from "@/features/jobs/workers/agentQueue";
import prisma from "@/shared/lib/db/prisma";
import { runAgentControlLoop, logAgentAudit } from "@/features/agent-runtime/server";

vi.mock("@/shared/lib/db/prisma", () => {
  const mockChatbotAgentRun = {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  };
  return {
    default: new Proxy({}, {
      get: (target, prop) => {
        if (prop === "chatbotAgentRun") return mockChatbotAgentRun;
        return undefined;
      },
      has: (target, prop) => prop === "chatbotAgentRun",
    }),
  };
});

vi.mock("@/features/agent-runtime/server", () => ({
  runAgentControlLoop: vi.fn(),
  logAgentAudit: vi.fn(),
}));

describe("Agent Queue Worker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stopAgentQueue();
    vi.mocked(prisma.chatbotAgentRun.findMany).mockResolvedValue([]);
    vi.mocked(prisma.chatbotAgentRun.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.chatbotAgentRun.update).mockResolvedValue(null);
  });

  afterEach(() => {
    stopAgentQueue();
  });

  it("processes a queued agent run", async () => {
    const mockRun = { id: "run-1", status: "queued", createdAt: new Date() };
    vi.mocked(prisma.chatbotAgentRun.findFirst).mockResolvedValue(mockRun as any);
    vi.mocked(runAgentControlLoop).mockResolvedValue(undefined);

    await processAgentQueue();

    expect(prisma.chatbotAgentRun.findFirst).toHaveBeenCalled();
    expect(prisma.chatbotAgentRun.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "run-1" },
      data: expect.objectContaining({ status: "running" }),
    }));
    expect(runAgentControlLoop).toHaveBeenCalledWith("run-1");
  });

  it("recovers stuck runs", async () => {
    const stuckRun = { id: "run-stuck", status: "running", updatedAt: new Date(Date.now() - 20 * 60 * 1000) };
    vi.mocked(prisma.chatbotAgentRun.findMany).mockResolvedValue([stuckRun] as any);

    await processAgentQueue();

    expect(prisma.chatbotAgentRun.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "run-stuck" },
      data: expect.objectContaining({ status: "queued" }),
    }));
    expect(logAgentAudit).toHaveBeenCalledWith("run-stuck", "warning", expect.any(String), expect.any(Object));
  });

  it("handles run failure", async () => {
    const mockRun = { id: "run-fail", status: "queued" };
    vi.mocked(prisma.chatbotAgentRun.findFirst).mockResolvedValue(mockRun as any);
    vi.mocked(runAgentControlLoop).mockRejectedValue(new Error("Agent Crash"));

    await processAgentQueue();

    expect(logAgentAudit).toHaveBeenCalledWith("run-fail", "error", expect.any(String), expect.any(Object));
    expect(prisma.chatbotAgentRun.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "run-fail" },
      data: expect.objectContaining({ status: "failed", errorMessage: "Agent Crash" }),
    }));
  });
});
