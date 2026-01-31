import {
  getPgConnectionUrl,
  getDatabaseName,
  assertValidBackupName,
} from "@/features/database/utils/postgres";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock server-only
vi.mock("server-only", () => ({}));

describe("postgres utils", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getPgConnectionUrl", () => {
    it("should strip schema parameter from DATABASE_URL", () => {
      process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db?schema=public";
      const result = getPgConnectionUrl();
      expect(result).toBe("postgresql://user:pass@localhost:5432/db");
    });

    it("should return raw URL if invalid", () => {
      process.env.DATABASE_URL = "invalid-url";
      expect(getPgConnectionUrl()).toBe("invalid-url");
    });
  });

  describe("getDatabaseName", () => {
    it("should extract database name from URL", () => {
      const url = "postgresql://user:pass@localhost:5432/my_awesome_db?schema=public";
      expect(getDatabaseName(url)).toBe("my_awesome_db");
    });

    it("should return 'database' if no pathname", () => {
      expect(getDatabaseName("postgresql://localhost")).toBe("database");
    });
  });

  describe("assertValidBackupName", () => {
    it("should pass for valid .dump file", () => {
      expect(() => assertValidBackupName("backup.dump")).not.toThrow();
    });

    it("should throw for invalid extension", () => {
      expect(() => assertValidBackupName("backup.sql")).toThrow("Invalid backup file type");
    });

    it("should throw for path traversal", () => {
      expect(() => assertValidBackupName("/etc/passwd.dump")).toThrow("Invalid backup name");
    });
  });
});
