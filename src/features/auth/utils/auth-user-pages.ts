import type { AuthUserPageSettings } from '@/shared/contracts/auth';

export const DEFAULT_AUTH_USER_PAGE_SETTINGS: AuthUserPageSettings = {
  allowSignup: true,
  allowPasswordReset: true,
  allowSocialLogin: true,
  requireEmailVerification: false,
};
