import 'server-only';

export {
  auth,
  findAuthUserByEmail,
  findAuthUserById,
  getAuthSecurityPolicy,
  normalizeAuthEmail,
  validatePasswordStrength,
} from '@/features/auth/server';
export { getAuthSecurityProfile } from '@/features/auth/services/auth-security-profile';
export { sendAuthEmail, shouldExposeAuthEmailDebug } from '@/features/auth/services/auth-email-delivery';
export {
  consumeEmailVerificationChallenge,
  createEmailVerificationChallenge,
  findActiveEmailVerificationChallengeByEmail,
} from '@/features/auth/services/auth-login-challenge';
export {
  createAuthUserWithEmail,
  markAuthUserEmailVerified,
  setAuthUserPassword,
} from '@/features/auth/services/auth-user-write-service';
export { assignAuthUserRole } from '@/features/auth/services/auth-access';
