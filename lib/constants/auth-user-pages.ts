export type AuthUserPageSettings = {
  allowSignup: boolean;
  allowPasswordReset: boolean;
  allowSocialLogin: boolean;
  requireEmailVerification: boolean;
};

export const DEFAULT_AUTH_USER_PAGE_SETTINGS: AuthUserPageSettings = {
  allowSignup: true,
  allowPasswordReset: true,
  allowSocialLogin: true,
  requireEmailVerification: false,
};
