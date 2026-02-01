import { describe, it, expect, vi, beforeEach } from "vitest";
import { notifyCriticalError } from "@/features/observability/lib/critical-error-notifier";
import { getAppDbProvider } from "@/shared/lib/db/app-db-provider";
import prisma from "@/shared/lib/db/prisma";

vi.mock("@/shared/lib/db/app-db-provider", () => ({
  getAppDbProvider: vi.fn(),
}));

vi.mock("@/shared/lib/db/prisma", () => ({
  default: {
    setting: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/shared/utils/transient-recovery", () => ({
  withTransientRecovery: vi.fn((fn) => fn()),
}));

describe("critical-error-notifier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getAppDbProvider as any).mockResolvedValue("prisma");
    (global as any).fetch = vi.fn().mockResolvedValue({ ok: true });
    
    // Default: enabled with a webhook
    (prisma.setting.findUnique as any).mockImplementation(({ where }: { where: { key: string } }) => {
      if (where.key === "critical_notifications_enabled") return { value: "true" };
      if (where.key === "critical_notifications_webhook_url") return { value: "http://webhook.test" };
      if (where.key === "critical_notifications_min_level") return { value: "error" };
      return null;
    });
  });

  it("should send a notification for a critical error", async () => {
    const log = {
      id: "log-1",
      level: "error" as const,
      message: "Critical breakdown",
      createdAt: new Date(),
    };

    const result = await notifyCriticalError(log as any, true);

    expect(result.delivered).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      "http://webhook.test",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Critical breakdown"),
      })
    );
  });

  it("should not send if not critical", async () => {
    const log = {
      level: "error" as const,
      message: "Error but not critical",
    };

    const result = await notifyCriticalError(log as any, false);

    expect(result.delivered).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("should not send if level is below threshold", async () => {
    (prisma.setting.findUnique as any).mockImplementation(({ where }: { where: { key: string } }) => {
      if (where.key === "critical_notifications_min_level") return { value: "error" };
      if (where.key === "critical_notifications_enabled") return { value: "true" };
      if (where.key === "critical_notifications_webhook_url") return { value: "http://webhook.test" };
      return null;
    });

    const log = {
      level: "warn" as const,
      message: "Warning message",
    };

    const result = await notifyCriticalError(log as any, true);

    expect(result.delivered).toBe(false);
  });

  it("should throttle duplicate notifications", async () => {
    const log = {
      level: "error" as const,
      message: "Repeated error",
    };

    const first = await notifyCriticalError(log as any, true);
    expect(first.delivered).toBe(true);

    const second = await notifyCriticalError(log as any, true);
    expect(second.delivered).toBe(false);
    expect(second.throttled).toBe(true);
  });
});
