/**
 * Authentication User Page Settings
 * 
 * Configuration utilities for authentication user interface pages.
 * Provides:
 * - Default user page behavior settings
 * - Signup and login flow configuration
 * - Social authentication controls
 * - Email verification requirements
 * - Password reset functionality toggles
 */

import type { AuthUserPageSettings } from '@/shared/contracts/auth';

export type { AuthUserPageSettings };

/** Default configuration for authentication user interface pages */
export const DEFAULT_AUTH_USER_PAGE_SETTINGS: AuthUserPageSettings = {
  allowSignup: true,
  allowPasswordReset: true,
  allowSocialLogin: true,
  requireEmailVerification: false,
};
