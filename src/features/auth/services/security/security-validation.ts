import { type AuthSecurityPolicy } from '@/features/auth/utils/auth-security';

export const validatePasswordStrength = (
  password: string,
  policy: AuthSecurityPolicy
): { ok: boolean; errors: string[] } => {
  const errors: string[] = [];
  if (password.length < policy.minPasswordLength) {
    errors.push(`Password must be at least ${policy.minPasswordLength} characters.`);
  }

  if (policy.requireStrongPassword === true) {
    const checks = [
      { cond: policy.requireUppercase, regex: /[A-Z]/, msg: 'Password must include at least one uppercase letter.' },
      { cond: policy.requireLowercase, regex: /[a-z]/, msg: 'Password must include at least one lowercase letter.' },
      { cond: policy.requireNumber, regex: /[0-9]/, msg: 'Password must include at least one number.' },
      { cond: policy.requireSymbol, regex: /[^A-Za-z0-9]/, msg: 'Password must include at least one symbol.' },
    ];
    for (const check of checks) {
      if (check.cond === true && !check.regex.test(password)) {
        errors.push(check.msg);
      }
    }
  }

  return { ok: errors.length === 0, errors };
};
