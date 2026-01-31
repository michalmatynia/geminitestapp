import { vi, describe, it, expect, beforeEach } from "vitest";
import prisma from "@/shared/lib/db/prisma";
import { logAgentAudit } from "@/features/agent-runtime/audit/index";

vi.mock("@/shared/lib/db/prisma", () => ({
  default: {
    agentAuditLog: {
      create: vi.fn(),
    },
  },
}));

describe("Agent Runtime - Audit Logging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create an audit log entry with metadata", async () => {
    const metadata = { step: "test", timestamp: new Date("2026-01-30T12:00:00Z"), big: BigInt(123) };
    
    await logAgentAudit("run-123", "info", "Test message", metadata);

    expect(prisma.agentAuditLog.create).toHaveBeenCalledWith({
      data: {
        runId: "run-123",
        level: "info",
        message: "Test message",
        metadata: {
          step: "test",
          timestamp: "2026-01-30T12:00:00.000Z",
          big: "123",
        },
      },
    });
  });

  it("should handle missing metadata", async () => {
    await logAgentAudit("run-123", "warning", "Warning message");

    expect(prisma.agentAuditLog.create).toHaveBeenCalledWith({
      data: {
        runId: "run-123",
        level: "warning",
        message: "Warning message",
      },
    });
  });

  it("should gracefully handle database errors", async () => {
    (prisma.agentAuditLog.create as any).mockRejectedValue(new Error("DB Down"));
    
    // Should not throw
    await expect(logAgentAudit("run-1", "error", "Fail")).resolves.not.toThrow();
  });
});
