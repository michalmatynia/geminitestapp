export type AuthSecurityPolicy = {
  minPasswordLength: number;
  requireStrongPassword: boolean;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSymbol: boolean;
  lockoutMaxAttempts: number;
  lockoutWindowMinutes: number;
  lockoutDurationMinutes: number;
  ipRateLimitMaxAttempts: number;
  ipRateLimitWindowMinutes: number;
  ipRateLimitDurationMinutes: number;
};

export const DEFAULT_AUTH_SECURITY_POLICY: AuthSecurityPolicy = {
  minPasswordLength: 10,
  requireStrongPassword: false,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSymbol: true,
  lockoutMaxAttempts: 5,
  lockoutWindowMinutes: 15,
  lockoutDurationMinutes: 15,
  ipRateLimitMaxAttempts: 15,
  ipRateLimitWindowMinutes: 15,
  ipRateLimitDurationMinutes: 10,
};

const clampNumber = (value: unknown, fallback: number, min: number, max: number): number => {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.min(Math.max(value, min), max);
};

export const normalizeAuthSecurityPolicy = (
  raw: unknown
): AuthSecurityPolicy => {
  const data = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    minPasswordLength: clampNumber(
      data.minPasswordLength,
      DEFAULT_AUTH_SECURITY_POLICY.minPasswordLength,
      6,
      64
    ),
    requireStrongPassword:
      typeof data.requireStrongPassword === "boolean"
        ? data.requireStrongPassword
        : DEFAULT_AUTH_SECURITY_POLICY.requireStrongPassword,
    requireUppercase:
      typeof data.requireUppercase === "boolean"
        ? data.requireUppercase
        : DEFAULT_AUTH_SECURITY_POLICY.requireUppercase,
    requireLowercase:
      typeof data.requireLowercase === "boolean"
        ? data.requireLowercase
        : DEFAULT_AUTH_SECURITY_POLICY.requireLowercase,
    requireNumber:
      typeof data.requireNumber === "boolean"
        ? data.requireNumber
        : DEFAULT_AUTH_SECURITY_POLICY.requireNumber,
    requireSymbol:
      typeof data.requireSymbol === "boolean"
        ? data.requireSymbol
        : DEFAULT_AUTH_SECURITY_POLICY.requireSymbol,
    lockoutMaxAttempts: clampNumber(
      data.lockoutMaxAttempts,
      DEFAULT_AUTH_SECURITY_POLICY.lockoutMaxAttempts,
      1,
      50
    ),
    lockoutWindowMinutes: clampNumber(
      data.lockoutWindowMinutes,
      DEFAULT_AUTH_SECURITY_POLICY.lockoutWindowMinutes,
      1,
      120
    ),
    lockoutDurationMinutes: clampNumber(
      data.lockoutDurationMinutes,
      DEFAULT_AUTH_SECURITY_POLICY.lockoutDurationMinutes,
      1,
      120
    ),
    ipRateLimitMaxAttempts: clampNumber(
      data.ipRateLimitMaxAttempts,
      DEFAULT_AUTH_SECURITY_POLICY.ipRateLimitMaxAttempts,
      1,
      200
    ),
    ipRateLimitWindowMinutes: clampNumber(
      data.ipRateLimitWindowMinutes,
      DEFAULT_AUTH_SECURITY_POLICY.ipRateLimitWindowMinutes,
      1,
      120
    ),
    ipRateLimitDurationMinutes: clampNumber(
      data.ipRateLimitDurationMinutes,
      DEFAULT_AUTH_SECURITY_POLICY.ipRateLimitDurationMinutes,
      1,
      120
    ),
  };
};
