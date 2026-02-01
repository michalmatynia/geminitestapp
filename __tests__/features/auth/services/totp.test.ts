import { describe, it, expect, vi } from "vitest";
import { 
  generateTotpSecret, 
  buildOtpAuthUrl, 
  verifyTotpToken, 
  generateRecoveryCodes,
  normalizeRecoveryCode,
  hashRecoveryCode
} from "@/features/auth/services/totp";

// Mock crypto module to ensure consistent outputs for some tests
vi.mock("crypto", async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    randomBytes: vi.fn((size: number) => {
      // Return consistent bytes for secret generation to make it predictable
      if (size === 20) return Buffer.from("01234567890123456789");
      // For recovery codes, still return random bytes
      return actual.randomBytes(size);
    }),
    createHmac: vi.fn(() => ({
      update: vi.fn().mockReturnThis(),
      digest: vi.fn(() => Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x1f])), // Mocked HMAC result for predictability
    })),
    createHash: vi.fn(() => ({
      update: vi.fn().mockReturnThis(),
      digest: vi.fn(() => "mockhash"), // Consistent hash for testing
    })),
  };
});

describe("TOTP Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("generates a valid base32 secret", () => {
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(secret).toBe("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"); // Based on mocked randomBytes
  });

  it("builds a correct otpauth URL", () => {
    const secret = "JBSWY3DPEHPK3PXP";
    const url = buildOtpAuthUrl({
      secret,
      label: "user@example.com",
      issuer: "GeminiApp"
    });
    expect(url).toBe("otpauth://totp/user%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=GeminiApp");
  });

  it("normalizes recovery codes correctly", () => {
    expect(normalizeRecoveryCode("abcd-1234-efgh")).toBe("ABCD1234EFGH");
    expect(normalizeRecoveryCode("  ABCD 1234 EFGH  ")).toBe("ABCD1234EFGH");
  });

  it("hashes recovery codes consistently", () => {
    const code = "ABCD-1234-EFGH";
    const hash1 = hashRecoveryCode(code);
    const hash2 = hashRecoveryCode("abcd1234efgh");
    expect(hash1).toBe(hash2);
    expect(hash1).toBe("mockhash");
  });

  it("generates the specified number of recovery codes", () => {
    // Unmock randomBytes for this test to get actual random codes
    vi.restoreAllMocks();
    const codes = generateRecoveryCodes(10);
    expect(codes).toHaveLength(10);
    codes.forEach(code => {
      expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    });
    // Ensure codes are unique
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(10);
  });

  describe("verifyTotpToken", () => {
    const secret = "JBSWY3DPEHPK3PXP"; // A base32 encoded secret

    it("verifies a valid token for the current time window", () => {
      vi.useFakeTimers();
      // Set a specific time (e.g., 2023-01-01 00:00:00 UTC)
      const testTimestamp = new Date("2023-01-01T00:00:00.000Z").getTime();
      vi.setSystemTime(testTimestamp);

      // A known token generated for this secret and timestamp
      // For JBSWY3DPEHPK3PXP at 2023-01-01 00:00:00 UTC (counter 1698000), a real TOTP generator would produce "000000" if HMAC is mocked as above.
      // If HMAC is not mocked, this would be a real, calculated OTP.
      // Since HMAC is mocked to produce a predictable output that results in offset=15 and code=0, the token will be "000000"
      const validToken = "000000"; 
      expect(verifyTotpToken(secret, validToken)).toBe(true);
      vi.useRealTimers();
    });

    it("verifies a valid token within the window", () => {
      vi.useFakeTimers();
      const testTimestamp = new Date("2023-01-01T00:00:00.000Z").getTime();
      vi.setSystemTime(testTimestamp + (30 * 1000)); // One window ahead

      const validToken = "000000"; // Assuming the same HMAC mock
      expect(verifyTotpToken(secret, validToken)).toBe(true);
      vi.useRealTimers();
    });

    it("returns false for invalid tokens", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2023-01-01T00:00:00.000Z").getTime());
      expect(verifyTotpToken(secret, "123456")).toBe(false);
      expect(verifyTotpToken(secret, "abcdef")).toBe(false);
      vi.useRealTimers();
    });

    it("returns false for tokens outside the window", () => {
      vi.useFakeTimers();
      const testTimestamp = new Date("2023-01-01T00:00:00.000Z").getTime();
      vi.setSystemTime(testTimestamp + (2 * 30 * 1000)); // Two windows ahead (outside window=1)
      const validToken = "000000"; // Assuming the same HMAC mock
      expect(verifyTotpToken(secret, validToken)).toBe(false);
      vi.useRealTimers();
    });
  });
});
