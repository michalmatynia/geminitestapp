import { describe, it, expect, beforeEach, vi } from "vitest";
import { 
  createSystemLog, 
  listSystemLogs, 
  getSystemLogMetrics, 
  clearSystemLogs 
} from "@/shared/lib/observability/system-log-repository";
import prisma from "@/shared/lib/db/prisma";
import { getAppDbProvider } from "@/shared/lib/db/app-db-provider";

// We mock getAppDbProvider to test both paths if needed, 
// but by default we test what's configured.
vi.mock("@/shared/lib/db/app-db-provider", async () => {
  const actual = await vi.importActual("@/shared/lib/db/app-db-provider") as any;
  return {
    ...actual,
    getAppDbProvider: vi.fn(),
  };
});

describe("systemLogRepository", () => {
  beforeEach(async () => {
    // Clear logs before each test
    // We assume Prisma for now as it's the standard in these tests
    (getAppDbProvider as any).mockResolvedValue("prisma");
    try {
      await prisma.systemLog.deleteMany({});
    } catch (_e) {
      // Table might not exist in some environments
    }
  });

  it("should create and list a system log", async () => {
    const logData = {
      level: "info" as const,
      message: "Test log message",
      source: "test-source",
      context: { foo: "bar" },
    };

    const created = await createSystemLog(logData);
    expect(created).toBeDefined();
    expect(created.message).toBe("Test log message");
    expect(created.level).toBe("info");
    expect(created.source).toBe("test-source");
    expect(created.context).toEqual({ foo: "bar" });

    const result = await listSystemLogs({ source: "test-source" });
    expect(result.total).toBe(1);
    expect(result.logs[0]!.message).toBe("Test log message");
  });

  it("should filter logs by level", async () => {
    await createSystemLog({ level: "info", message: "Info log" });
    await createSystemLog({ level: "error", message: "Error log" });

    const infoLogs = await listSystemLogs({ level: "info" });
    expect(infoLogs.total).toBe(1);
    expect(infoLogs.logs[0]!.level).toBe("info");

    const errorLogs = await listSystemLogs({ level: "error" });
    expect(errorLogs.total).toBe(1);
    expect(errorLogs.logs[0]!.level).toBe("error");
  });

  it("should search logs by query", async () => {
    await createSystemLog({ message: "Alpha log", source: "src1" });
    await createSystemLog({ message: "Beta log", source: "src2" });

    const searchResult = await listSystemLogs({ query: "Alpha" });
    expect(searchResult.total).toBe(1);
    expect(searchResult.logs[0]!.message).toBe("Alpha log");
  });

  it("should get metrics", async () => {
    await createSystemLog({ level: "info", message: "I1", source: "S1" });
    await createSystemLog({ level: "info", message: "I2", source: "S1" });
    await createSystemLog({ level: "error", message: "E1", source: "S2" });

    const metrics = await getSystemLogMetrics({});
    expect(metrics.total).toBe(3);
    expect(metrics.levels.info).toBe(2);
    expect(metrics.levels.error).toBe(1);
    expect(metrics.topSources).toContainEqual({ source: "S1", count: 2 });
    expect(metrics.topSources).toContainEqual({ source: "S2", count: 1 });
  });

  it("should clear logs", async () => {
    await createSystemLog({ message: "Log 1" });
    await createSystemLog({ message: "Log 2" });

    const beforeClear = await listSystemLogs({});
    expect(beforeClear.total).toBe(2);

    await clearSystemLogs();

    const afterClear = await listSystemLogs({});
    expect(afterClear.total).toBe(0);
  });

  it("should clear logs before a certain date", async () => {
    const oldDate = new Date();
    oldDate.setFullYear(2020);
    
    await createSystemLog({ message: "Old Log", createdAt: oldDate });
    await createSystemLog({ message: "New Log", createdAt: new Date() });

    const midDate = new Date();
    midDate.setFullYear(2021);

    const cleared = await clearSystemLogs(midDate);
    expect(cleared.deleted).toBe(1);

    const remaining = await listSystemLogs({});
    expect(remaining.total).toBe(1);
    expect(remaining.logs[0]!.message).toBe("New Log");
  });
});
