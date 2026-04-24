import type { AuthSecurityPolicy } from '@/shared/contracts/auth';

export type { AuthSecurityPolicy };

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
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.min(Math.max(value, min), max);
};

const resolveBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

const normalizePasswordPolicy = (data: Record<string, unknown>): Partial<AuthSecurityPolicy> => ({
  minPasswordLength: clampNumber(
    data['minPasswordLength'],
    DEFAULT_AUTH_SECURITY_POLICY.minPasswordLength,
    6,
    64
  ),
  requireStrongPassword: resolveBoolean(
    data['requireStrongPassword'],
    DEFAULT_AUTH_SECURITY_POLICY.requireStrongPassword
  ),
  requireUppercase: resolveBoolean(
    data['requireUppercase'],
    DEFAULT_AUTH_SECURITY_POLICY.requireUppercase
  ),
  requireLowercase: resolveBoolean(
    data['requireLowercase'],
    DEFAULT_AUTH_SECURITY_POLICY.requireLowercase
  ),
  requireNumber: resolveBoolean(
    data['requireNumber'],
    DEFAULT_AUTH_SECURITY_POLICY.requireNumber
  ),
  requireSymbol: resolveBoolean(
    data['requireSymbol'],
    DEFAULT_AUTH_SECURITY_POLICY.requireSymbol
  ),
});

const normalizeLockoutPolicy = (data: Record<string, unknown>): Partial<AuthSecurityPolicy> => ({
  lockoutMaxAttempts: clampNumber(
    data['lockoutMaxAttempts'],
    DEFAULT_AUTH_SECURITY_POLICY.lockoutMaxAttempts,
    1,
    50
  ),
  lockoutWindowMinutes: clampNumber(
    data['lockoutWindowMinutes'],
    DEFAULT_AUTH_SECURITY_POLICY.lockoutWindowMinutes,
    1,
    120
  ),
  lockoutDurationMinutes: clampNumber(
    data['lockoutDurationMinutes'],
    DEFAULT_AUTH_SECURITY_POLICY.lockoutDurationMinutes,
    1,
    120
  ),
});

const normalizeRateLimitPolicy = (data: Record<string, unknown>): Partial<AuthSecurityPolicy> => ({
  ipRateLimitMaxAttempts: clampNumber(
    data['ipRateLimitMaxAttempts'],
    DEFAULT_AUTH_SECURITY_POLICY.ipRateLimitMaxAttempts,
    1,
    200
  ),
  ipRateLimitWindowMinutes: clampNumber(
    data['ipRateLimitWindowMinutes'],
    DEFAULT_AUTH_SECURITY_POLICY.ipRateLimitWindowMinutes,
    1,
    120
  ),
  ipRateLimitDurationMinutes: clampNumber(
    data['ipRateLimitDurationMinutes'],
    DEFAULT_AUTH_SECURITY_POLICY.ipRateLimitDurationMinutes,
    1,
    120
  ),
});

export const normalizeAuthSecurityPolicy = (raw: unknown): AuthSecurityPolicy => {
  const data =
    raw !== undefined && raw !== null && typeof raw === 'object'
      ? (raw as Record<string, unknown>)
      : {};

  const policy: AuthSecurityPolicy = {
    ...DEFAULT_AUTH_SECURITY_POLICY,
    ...normalizePasswordPolicy(data),
    ...normalizeLockoutPolicy(data),
    ...normalizeRateLimitPolicy(data),
  };
  return policy;
};
