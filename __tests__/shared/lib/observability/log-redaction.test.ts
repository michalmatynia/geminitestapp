import { describe, it, expect } from "vitest";
import { isSensitiveKey, truncateString, REDACTED_VALUE } from "@/features/observability/lib/log-redaction";

describe("log-redaction", () => {
  it("should identify sensitive keys", () => {
    expect(isSensitiveKey("password")).toBe(true);
    expect(isSensitiveKey("user_password")).toBe(true);
    expect(isSensitiveKey("api_key")).toBe(true);
    expect(isSensitiveKey("apiKey")).toBe(true);
    expect(isSensitiveKey("token")).toBe(true);
    expect(isSensitiveKey("secret")).toBe(true);
    expect(isSensitiveKey("authorization")).toBe(true);
    expect(isSensitiveKey("cookie")).toBe(true);
    expect(isSensitiveKey("jwt")).toBe(true);
  });

  it("should not flag non-sensitive keys", () => {
    expect(isSensitiveKey("username")).toBe(false);
    expect(isSensitiveKey("email")).toBe(false);
    expect(isSensitiveKey("message")).toBe(false);
    expect(isSensitiveKey("title")).toBe(false);
  });

  it("should truncate long strings", () => {
    const longString = "a".repeat(100);
    const truncated = truncateString(longString, 10);
    expect(truncated).toBe("aaaaaaaaaa…[truncated]");
    expect(truncated.length).toBeGreaterThan(10);
  });

  it("should not truncate short strings", () => {
    const shortString = "hello";
    expect(truncateString(shortString, 10)).toBe("hello");
  });

  it("should have a REDACTED_VALUE constant", () => {
    expect(REDACTED_VALUE).toBe("[REDACTED]");
  });
});
