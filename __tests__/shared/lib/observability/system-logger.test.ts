import { describe, it, expect, vi, beforeEach } from "vitest";
import { logSystemEvent, logSystemError } from "@/features/observability/lib/system-logger";
import { createSystemLog } from "@/features/observability/lib/system-log-repository";
import { notifyCriticalError } from "@/features/observability/lib/critical-error-notifier";

vi.mock("@/features/observability/lib/system-log-repository", () => ({
  createSystemLog: vi.fn().mockResolvedValue({ id: "log-1", level: "info", message: "Logged" }),
}));

vi.mock("@/features/observability/lib/critical-error-notifier", () => ({
  notifyCriticalError: vi.fn().mockResolvedValue({ delivered: true }),
}));

describe("system-logger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should log a system event", async () => {
    await logSystemEvent({
      level: "info",
      message: "Something happened",
      source: "test",
      context: { foo: "bar" },
    });

    expect(createSystemLog).toHaveBeenCalledWith(expect.objectContaining({
      level: "info",
      message: "Something happened",
      source: "test",
      context: expect.objectContaining({ foo: "bar" }),
    }));
  });

  it("should log a system error", async () => {
    const error = new Error("Boom");
    await logSystemError({
      message: "An error occurred",
      error,
    });

    expect(createSystemLog).toHaveBeenCalledWith(expect.objectContaining({
      level: "error",
      message: "An error occurred",
      stack: error.stack,
      context: expect.objectContaining({
        error: expect.objectContaining({
          message: "Boom",
        }),
        fingerprint: expect.any(String),
      }),
    }));
  });

  it("should notify for critical errors", async () => {
    const logResult = { id: "log-critical", level: "error", message: "Critical!" };
    (createSystemLog as any).mockResolvedValue(logResult);

    await logSystemEvent({
      level: "error",
      message: "Critical!",
      critical: true,
    });

    expect(notifyCriticalError).toHaveBeenCalledWith(logResult, true);
  });

  it("should extract info from Request", async () => {
    const req = new Request("http://localhost/api/test", {
      method: "POST",
      headers: { "x-request-id": "req-123" },
    });

    await logSystemEvent({
      message: "Request log",
      request: req,
    });

    expect(createSystemLog).toHaveBeenCalledWith(expect.objectContaining({
      path: "/api/test",
      method: "POST",
      requestId: "req-123",
    }));
  });
});
