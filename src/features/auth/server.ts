import 'server-only';

export * from './auth';
export { invalidateAuthAccessCache } from './services/auth-access';
export * from './services/auth-login-challenge';
export { getAuthDataProvider, requireAuthProvider } from '@/shared/lib/auth/services/auth-provider';
export type { AuthDbProvider } from '@/shared/lib/auth/services/auth-provider';
export * from './services/auth-security';
export {
  getAuthSecurityProfile,
  updateAuthSecurityProfile,
} from './services/auth-security-profile';
export type { AuthSecurityProfile } from './services/auth-security-profile';
export { invalidateAuthSecurityProfileCache } from './services/auth-security-profile';
export * from './services/auth-settings';
export { normalizeAuthEmail } from './services/auth-user-repository';
export * from './services/auth-user-service';
export * from './services/user-preferences-repository';
export * from './services/totp';
export * from '@/shared/contracts/auth';
export { AUTH_SETTINGS_KEYS } from './utils/auth-management';
export type { AuthUserRoleMap } from './utils/auth-management';
export * from '@/shared/lib/security/encryption';
export { logAuthEvent } from './utils/auth-request-logger';
