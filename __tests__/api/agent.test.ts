import prisma from "@/lib/prisma";
import { GET as listRuns, POST as createRun } from "@/app/api/chatbot/agent/route";
import { GET as getLogs } from "@/app/api/chatbot/agent/[runId]/logs/route";
import { GET as getAudits } from "@/app/api/chatbot/agent/[runId]/audits/route";

describe("Agent API", () => {
  beforeEach(async () => {
    await prisma.agentBrowserLog.deleteMany({});
    await prisma.agentBrowserSnapshot.deleteMany({});
    await prisma.agentAuditLog.deleteMany({});
    await prisma.agentMemoryItem.deleteMany({});
    await prisma.chatbotAgentRun.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should reject missing prompt when creating a run", async () => {
    const req = new Request("http://localhost/api/chatbot/agent", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await createRun(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Prompt is required.");
  });

  it("should list agent runs with counts", async () => {
    const run = await prisma.chatbotAgentRun.create({
      data: {
        prompt: "Browse example.com",
        tools: ["agent-mode"],
      },
    });
    await prisma.agentBrowserLog.create({
      data: {
        runId: run.id,
        level: "info",
        message: "Stub log",
      },
    });
    await prisma.agentBrowserSnapshot.create({
      data: {
        runId: run.id,
        url: "about:blank",
        title: "Stub",
        domHtml: "<html></html>",
        domText: "stub",
      },
    });

    const res = await listRuns();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.runs).toHaveLength(1);
    expect(data.runs[0]._count.browserLogs).toBe(1);
    expect(data.runs[0]._count.browserSnapshots).toBe(1);
  });

  it("should return agent logs for a run", async () => {
    const run = await prisma.chatbotAgentRun.create({
      data: { prompt: "Logs test", tools: ["agent-mode"] },
    });
    await prisma.agentBrowserLog.create({
      data: {
        runId: run.id,
        level: "info",
        message: "Log entry",
      },
    });

    const res = await getLogs(new Request("http://localhost"), {
      params: Promise.resolve({ runId: run.id }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.logs).toHaveLength(1);
    expect(data.logs[0].message).toBe("Log entry");
  });

  it("should return agent audit logs for a run", async () => {
    const run = await prisma.chatbotAgentRun.create({
      data: { prompt: "Audit test", tools: ["agent-mode"] },
    });
    await prisma.agentAuditLog.create({
      data: {
        runId: run.id,
        level: "info",
        message: "Audit entry",
        metadata: { step: "tool" },
      },
    });

    const res = await getAudits(new Request("http://localhost"), {
      params: Promise.resolve({ runId: run.id }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.audits).toHaveLength(1);
    expect(data.audits[0].metadata.step).toBe("tool");
  });
});
