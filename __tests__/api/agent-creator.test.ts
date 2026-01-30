import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST, DELETE } from "@/app/api/agentcreator/agent/route";
import prisma from "@/shared/lib/db/prisma";
import { startAgentQueue } from "@/features/jobs/server";

vi.mock("@/shared/lib/db/prisma", () => ({
  default: {
    chatbotAgentRun: {
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("@/features/jobs/server", () => ({
  startAgentQueue: vi.fn(),
}));

vi.mock("@/features/agent-runtime/server", () => ({
  logAgentAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/shared/lib/api/api-handler", () => ({
  apiHandler: (handler: any) => handler,
  apiHandlerWithParams: (handler: any) => handler,
}));

describe("Agent Creator API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("returns list of agent runs", async () => {
      const mockRuns = [{ id: "run-1", prompt: "test" }];
      vi.mocked(prisma.chatbotAgentRun.findMany).mockResolvedValue(mockRuns as any);

      const req = new NextRequest("http://localhost/api/agentcreator/agent");
      const res = await GET(req, {} as any);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.runs).toEqual(mockRuns);
      expect(startAgentQueue).toHaveBeenCalled();
    });

    it("returns 500 if prisma table is missing", async () => {
      const originalPrisma = (prisma as any).chatbotAgentRun;
      delete (prisma as any).chatbotAgentRun;
      
      const req = new NextRequest("http://localhost/api/agentcreator/agent");
      const res = await GET(req, {} as any);
      expect(res.status).toBe(500);

      (prisma as any).chatbotAgentRun = originalPrisma;
    });
  });

  describe("POST", () => {
    it("creates a new agent run", async () => {
      vi.mocked(prisma.chatbotAgentRun.create).mockResolvedValue({
        id: "new-run",
        status: "queued",
      } as any);

      const req = new NextRequest("http://localhost/api/agentcreator/agent", {
        method: "POST",
        body: JSON.stringify({
          prompt: "Verify the price of item X",
          model: "gpt-4",
          tools: ["browser"],
          planSettings: { maxSteps: 5 }
        }),
      });

      const res = await POST(req, {} as any);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.runId).toBe("new-run");
      expect(prisma.chatbotAgentRun.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            prompt: "Verify the price of item X",
            planState: expect.objectContaining({
                settings: expect.objectContaining({
                    maxSteps: 5
                })
            })
          })
        })
      );
    });

    it("returns 400 if prompt is missing", async () => {
      const req = new NextRequest("http://localhost/api/agentcreator/agent", {
        method: "POST",
        body: JSON.stringify({ prompt: "" }),
      });

      const res = await POST(req, {} as any);
      expect(res.status).toBe(400);
    });
  });

  describe("DELETE", () => {
    it("deletes terminal runs", async () => {
      vi.mocked(prisma.chatbotAgentRun.findMany).mockResolvedValue([{ id: "run-1" }] as any);
      vi.mocked(prisma.chatbotAgentRun.deleteMany).mockResolvedValue({ count: 1 } as any);

      const req = new NextRequest("http://localhost/api/agentcreator/agent?scope=terminal", {
        method: "DELETE",
      });

      const res = await DELETE(req, {} as any);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.deleted).toBe(1);
    });

    it("returns 400 for unsupported scope", async () => {
      const req = new NextRequest("http://localhost/api/agentcreator/agent?scope=all", {
        method: "DELETE",
      });
      const res = await DELETE(req, {} as any);
      expect(res.status).toBe(400);
    });
  });
});
