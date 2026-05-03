import { type AuthSecurityPolicy } from '@/features/auth/utils/auth-security';

export const validatePasswordStrength = (
  password: string,
  policy: AuthSecurityPolicy
): { ok: boolean; errors: string[] } => {
  const errors: string[] = [];
  if (password.length < policy.minPasswordLength) {
    errors.push(`Password must be at least ${policy.minPasswordLength} characters.`);
  }

  if (policy.requireStrongPassword) {
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must include at least one uppercase letter.');
    }
    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must include at least one lowercase letter.');
    }
    if (policy.requireNumber && !/[0-9]/.test(password)) {
      errors.push('Password must include at least one number.');
    }
    if (policy.requireSymbol && !/[^A-Za-z0-9]/.test(password)) {
      errors.push('Password must include at least one symbol.');
    }
  }

  return { ok: errors.length === 0, errors };
};
