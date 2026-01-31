import {
  encryptAuthSecret,
  decryptAuthSecret,
} from "@/features/auth/utils/auth-encryption";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock server-only
vi.mock("server-only", () => ({}));

describe("auth-encryption", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    // 32-byte key in base64: "a" * 32
    process.env.AUTH_ENCRYPTION_KEY = Buffer.from("a".repeat(32)).toString("base64");
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should encrypt and decrypt a value correctly", () => {
    const secret = "my-super-secret-password";
    const encrypted = encryptAuthSecret(secret);
    
    expect(encrypted).toContain(":");
    expect(encrypted.split(":")).toHaveLength(3);
    
    const decrypted = decryptAuthSecret(encrypted);
    expect(decrypted).toBe(secret);
  });

  it("should throw error if payload is invalid during decryption", () => {
    expect(() => decryptAuthSecret("invalidpayload")).toThrow("Invalid encrypted payload");
  });

  it("should throw error if key is missing", () => {
    delete process.env.AUTH_ENCRYPTION_KEY;
    delete process.env.INTEGRATION_ENCRYPTION_KEY;
    expect(() => encryptAuthSecret("test")).toThrow("is required for auth secrets");
  });
});
