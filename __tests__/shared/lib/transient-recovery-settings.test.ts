import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTransientRecoverySettings } from "@/features/observability/lib/transient-recovery/settings";
import { getAppDbProvider } from "@/shared/lib/db/app-db-provider";
import prisma from "@/shared/lib/db/prisma";
import { DEFAULT_TRANSIENT_RECOVERY_SETTINGS } from "@/features/observability/lib/transient-recovery/constants";

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

describe("Transient Recovery Settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = "postgresql://...";
  });

  it("returns default settings if no setting found in DB", async () => {
    vi.mocked(getAppDbProvider).mockResolvedValue("prisma");
    vi.mocked(prisma.setting.findUnique).mockResolvedValue(null);

    const settings = await getTransientRecoverySettings({ force: true });
    
    expect(settings).toEqual(DEFAULT_TRANSIENT_RECOVERY_SETTINGS);
  });

  it("normalizes invalid values from DB", async () => {
    vi.mocked(getAppDbProvider).mockResolvedValue("prisma");
    const invalidData = JSON.stringify({
      retry: { maxAttempts: -5, initialDelayMs: "invalid" }
    });
    vi.mocked(prisma.setting.findUnique).mockResolvedValue({ value: invalidData } as any);

    const settings = await getTransientRecoverySettings({ force: true });
    
    expect(settings.retry.maxAttempts).toBe(DEFAULT_TRANSIENT_RECOVERY_SETTINGS.retry.maxAttempts);
    expect(settings.retry.initialDelayMs).toBe(DEFAULT_TRANSIENT_RECOVERY_SETTINGS.retry.initialDelayMs);
  });

  it("respects valid settings from DB", async () => {
    vi.mocked(getAppDbProvider).mockResolvedValue("prisma");
    const validData = JSON.stringify({
      enabled: false,
      retry: { maxAttempts: 10, initialDelayMs: 5000 }
    });
    vi.mocked(prisma.setting.findUnique).mockResolvedValue({ value: validData } as any);

    const settings = await getTransientRecoverySettings({ force: true });
    
    expect(settings.enabled).toBe(false);
    expect(settings.retry.maxAttempts).toBe(10);
    expect(settings.retry.initialDelayMs).toBe(5000);
  });
});
