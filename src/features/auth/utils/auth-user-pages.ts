import type { AuthUserPageSettingsDto } from '@/shared/contracts/auth';

export type AuthUserPageSettings = AuthUserPageSettingsDto;

export const DEFAULT_AUTH_USER_PAGE_SETTINGS: AuthUserPageSettings = {
  allowSignup: true,
  allowPasswordReset: true,
  allowSocialLogin: true,
  requireEmailVerification: false,
};
