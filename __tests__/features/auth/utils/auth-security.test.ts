import { describe, it, expect } from 'vitest';

import {
  normalizeAuthSecurityPolicy,
  DEFAULT_AUTH_SECURITY_POLICY,
} from '@/features/auth/utils/auth-security';

describe('auth-security utils', () => {
  describe('normalizeAuthSecurityPolicy', () => {
    it('should return defaults for null/undefined input', () => {
      expect(normalizeAuthSecurityPolicy(null)).toEqual(DEFAULT_AUTH_SECURITY_POLICY);
      expect(normalizeAuthSecurityPolicy(undefined)).toEqual(DEFAULT_AUTH_SECURITY_POLICY);
    });

    it('should normalize valid partial input', () => {
      const input = {
        minPasswordLength: 12,
        requireStrongPassword: true,
      };
      const result = normalizeAuthSecurityPolicy(input);
      expect(result.minPasswordLength).toBe(12);
      expect(result.requireStrongPassword).toBe(true);
      expect(result.requireUppercase).toBe(DEFAULT_AUTH_SECURITY_POLICY.requireUppercase);
    });

    it('should clamp numeric values', () => {
      const input = {
        minPasswordLength: 1, // min is 6
        lockoutMaxAttempts: 100, // max is 50
      };
      const result = normalizeAuthSecurityPolicy(input);
      expect(result.minPasswordLength).toBe(6);
      expect(result.lockoutMaxAttempts).toBe(50);
    });

    it('should handle invalid types by using fallbacks', () => {
      const input = {
        minPasswordLength: 'invalid',
        requireUppercase: 'not-a-boolean',
      };
      const result = normalizeAuthSecurityPolicy(input);
      expect(result.minPasswordLength).toBe(DEFAULT_AUTH_SECURITY_POLICY.minPasswordLength);
      expect(result.requireUppercase).toBe(DEFAULT_AUTH_SECURITY_POLICY.requireUppercase);
    });
  });
});
