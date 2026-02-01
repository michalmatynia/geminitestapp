import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { withRetry, withCircuitBreaker, resetCircuitBreaker } from "@/shared/utils/retry";
import { externalServiceError } from "@/shared/errors/app-error";

// Mock server-only
vi.mock("server-only", () => ({}));

// Mock system logger to avoid DB/network calls
vi.mock("@/features/observability/lib/system-logger", () => ({
  logSystemEvent: vi.fn().mockResolvedValue(undefined),
}));

describe("Retry Utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("withRetry", () => {
    beforeEach(() => {
      vi.useRealTimers();
    });

    it("successfully returns value on first attempt", async () => {
      const op = vi.fn().mockResolvedValue("success");
      const result = await withRetry(op);
      expect(result).toBe("success");
      expect(op).toHaveBeenCalledTimes(1);
    });

    it("retries until success", async () => {
      // We must use retryable errors because withRetry calls isRetryableError(error)
      const op = vi.fn()
        .mockRejectedValueOnce(externalServiceError("Fail 1"))
        .mockRejectedValueOnce(externalServiceError("Fail 2"))
        .mockResolvedValue("finally success");

      const result = await withRetry(op, { maxAttempts: 3, initialDelayMs: 0, jitter: false });
      
      expect(result).toBe("finally success");
      expect(op).toHaveBeenCalledTimes(3);
    });

    it("throws last error after max attempts", async () => {
      const op = vi.fn().mockRejectedValue(externalServiceError("Persistent Fail"));
      
      const promise = withRetry(op, { maxAttempts: 2, initialDelayMs: 0, jitter: false });
      await expect(promise).rejects.toThrow("Persistent Fail");
      expect(op).toHaveBeenCalledTimes(2);
    });
  });

  describe("withCircuitBreaker", () => {
    const circuitId = "test-circuit";

    beforeEach(() => {
      vi.useFakeTimers();
      resetCircuitBreaker(circuitId);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("opens circuit after failure threshold reached", async () => {
      const op = vi.fn().mockRejectedValue(new Error("Fail"));
      
      // Fill threshold (default 5)
      for (let i = 0; i < 5; i++) {
        await expect(withCircuitBreaker(op, { circuitId })).rejects.toThrow("Fail");
      }

      // 6th call should throw Circuit Breaker error immediately without calling op
      await expect(withCircuitBreaker(op, { circuitId })).rejects.toThrow(/Circuit breaker open/);
      expect(op).toHaveBeenCalledTimes(5);
    });

    it("half-opens and resets after timeout", async () => {
      const op = vi.fn().mockRejectedValue(new Error("Fail"));
      
      for (let i = 0; i < 5; i++) {
        try { await withCircuitBreaker(op, { circuitId }); } catch {}
      }

      // Move time forward
      await vi.advanceTimersByTimeAsync(60001);

      // Now it should call op again (half-open)
      op.mockResolvedValue("recovered");
      const result = await withCircuitBreaker(op, { circuitId });
      expect(result).toBe("recovered");
      expect(op).toHaveBeenCalledTimes(6);
    });
  });
});