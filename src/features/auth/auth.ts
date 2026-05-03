import 'server-only';

import { MongoDBAdapter } from '@auth/mongodb-adapter';
import bcrypt from 'bcryptjs';
import NextAuth, { type NextAuthConfig, type Session, type User } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Facebook from 'next-auth/providers/facebook';
import Google from 'next-auth/providers/google';

import { getAuthAccessForUser } from '@/features/auth/services/auth-access';
import { consumeLoginChallenge } from '@/features/auth/services/auth-login-challenge';
import {
  checkLoginAllowed,
  extractClientIp,
  recordLoginFailure,
  recordLoginSuccess,
} from '@/features/auth/services/auth-security';
import {
  getAuthSecurityProfile,
  updateAuthSecurityProfile,
} from '@/features/auth/services/auth-security-profile';
import { getAuthUserPageSettings } from '@/features/auth/services/auth-settings';
import { hashRecoveryCode, verifyTotpToken } from '@/features/auth/services/totp';
import { ActivityTypes } from '@/shared/constants/observability';
import { getAuthOAuthSecrets } from '@/shared/lib/auth/auth-secret-settings';
import { getMongoClient } from '@/shared/lib/db/mongo-client';
import { decryptAuthSecret } from '@/shared/lib/security/encryption';
import { logActivity } from '@/shared/utils/observability/activity-service';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { authConfig } from './auth.config';
import { findAuthUserByEmail, findAuthUserById } from './services/auth-user-service';

import type { JWT } from 'next-auth/jwt';
import type { Provider } from 'next-auth/providers';

interface AuthCredentials {
  email: string;
  password?: string;
  otp?: string;
  recoveryCode?: string;
  challengeId?: string;
  authFlow?: string;
}

const getString = (c: Record<string, unknown> | null, k: string): string | undefined => {
  const v = c?.[k];
  return typeof v === 'string' ? v : undefined;
};

const extractCredentials = (c: Record<string, unknown> | null): AuthCredentials => ({
  email: getString(c, 'email') ?? '',
  password: getString(c, 'password'),
  otp: getString(c, 'otp'),
  recoveryCode: getString(c, 'recoveryCode'),
  challengeId: getString(c, 'challengeId'),
  authFlow: getString(c, 'authFlow')?.trim(),
});

interface UserRef { id: string; emailVerified: boolean | null; passwordHash: string | null; email: string; name?: string | null; image?: string | null; }

const resolveUserAndChallenge = async (creds: AuthCredentials, ip: string | undefined): Promise<{
  challenge: Awaited<ReturnType<typeof consumeLoginChallenge>> | null;
  user: UserRef | null;
}> => {
  const { challengeId, email } = creds;
  if (challengeId !== undefined) {
    const challenge = await consumeLoginChallenge({ id: challengeId, email, ip });
    const user = challenge !== null ? await findAuthUserById(challenge.userId) : null;
    return { challenge, user: user as UserRef | null };
  }
  const user = await findAuthUserByEmail(email);
  return { challenge: null, user: user as UserRef | null };
};

const checkAccountStatus = (s: { bannedAt: Date | null; disabledAt: Date | null; }): boolean => s.bannedAt === null && s.disabledAt === null;

const checkEmailVerification = (u: UserRef, s: { requireEmailVerification: boolean; }, f: string | undefined): boolean => {
  if (s.requireEmailVerification !== true && f !== 'kangur_parent') return true;
  return u.emailVerified === true;
};

const checkSecurityProfile = async (u: UserRef, ip: string | undefined, f: string | undefined): Promise<boolean> => {
  const [sec, set] = await Promise.all([getAuthSecurityProfile(u.id), getAuthUserPageSettings()]);
  if (checkAccountStatus(sec) === false) return false;
  if (checkEmailVerification(u, set, f) === false) return false;
  if (sec.allowedIps.length > 0 && (ip === undefined || sec.allowedIps.includes(ip) === false)) return false;
  return true;
};

const verifyRecovery = async (uid: string, codes: string[], recovery: string): Promise<boolean> => {
  const hashed = hashRecoveryCode(recovery);
  if (codes.includes(hashed) === false) return false;
  await updateAuthSecurityProfile(uid, { recoveryCodes: codes.filter((c) => c !== hashed) });
  return true;
};

interface SecInfo { mfaEnabled: boolean; recoveryCodes: string[]; mfaSecret: string | null; }

const verifyMfa = async (uid: string, sec: SecInfo, creds: AuthCredentials): Promise<boolean> => {
  if (sec.mfaEnabled === false) return true;
  const rec = (creds.recoveryCode ?? '').trim();
  if (rec !== '') return verifyRecovery(uid, sec.recoveryCodes, rec);
  const otp = (creds.otp ?? '').trim();
  const s = sec.mfaSecret;
  if (otp !== '' && s !== null) return verifyTotpToken(decryptAuthSecret(s), otp);
  return false;
};

interface PreRes { ip: string | undefined; challenge: { purpose: string } | null; user: UserRef; }

const checkLoginPreconditions = async (creds: AuthCredentials, request: Request): Promise<PreRes | null> => {
  const { email, password, challengeId } = creds;
  if (email === '' || (password === undefined && challengeId === undefined)) return null;
  const ip = extractClientIp(request);
  const [allowed, res] = await Promise.all([checkLoginAllowed({ email, ip }), resolveUserAndChallenge(creds, ip)]);
  if (allowed.allowed === false || res.user === null) {
    if (res.user !== null) await recordLoginFailure({ email: String(creds.email), ip, request });
    return null;
  }
  return { ip, challenge: res.challenge as { purpose: string } | null, user: res.user };
};

const checkPassword = async (user: UserRef, password?: string): Promise<boolean> => {
  if (user.passwordHash === null || password === undefined) return false;
  return bcrypt.compare(password, user.passwordHash);
};

const validateMfa = async (user: UserRef, creds: AuthCredentials): Promise<boolean> => {
  const sec = await getAuthSecurityProfile(user.id);
  return verifyMfa(user.id, sec, creds);
};

const getSuccessResponse = (user: UserRef, authFlow: string | undefined, challenge: { purpose: string } | null): User => {
  const isK = authFlow === 'kangur_parent';
  const method = challenge?.purpose === 'magic_login' ? 'magic_link' : 'password';
  return { id: user.id, email: user.email, name: user.name ?? null, image: user.image ?? null, ...(isK ? { activitySurface: 'kangur', authFlow, loginMethod: method } : {}) };
};

const validateAuth = async (creds: AuthCredentials, request: Request): Promise<User | null> => {
  const pre = await checkLoginPreconditions(creds, request);
  if (pre === null) return null;
  const { authFlow, password, challengeId, email } = creds;
  const { ip, challenge, user } = pre;
  const pOk = await checkSecurityProfile(user, ip, authFlow);
  if (pOk === false) { await recordLoginFailure({ email: String(email), ip, request }); return null; }
  if (challengeId === undefined) {
    const passOk = await checkPassword(user, password);
    if (passOk === false) { await recordLoginFailure({ email: String(email), ip, request }); return null; }
  }
  const mfaOk = await validateMfa(user, creds);
  if (mfaOk === false) { await recordLoginFailure({ email: String(email), ip, request }); return null; }
  await recordLoginSuccess({ email: String(email), ip, request, userId: user.id });
  return getSuccessResponse(user, authFlow, challenge);
};

const credentialsProvider = Credentials({
  name: 'Credentials',
  credentials: {},
  async authorize(credentials: Record<string, unknown> | null, request: Request) {
    try { return await validateAuth(extractCredentials(credentials), request); }
    catch (e: unknown) { await ErrorSystem.captureException(e, { service: 'auth', action: 'authorize' }); return null; }
  },
});

const buildProviders = async (): Promise<Provider[]> => {
  const providers: Provider[] = [credentialsProvider];
  const secrets = await getAuthOAuthSecrets();
  if (secrets.google.clientId !== undefined && secrets.google.clientSecret !== undefined) {
    providers.push(Google({ clientId: secrets.google.clientId, clientSecret: secrets.google.clientSecret }));
  }
  if (secrets.facebook.clientId !== undefined && secrets.facebook.clientSecret !== undefined) {
    providers.push(Facebook({ clientId: secrets.facebook.clientId, clientSecret: secrets.facebook.clientSecret }));
  }
  return providers;
};

const checkRefreshRequired = (token: JWT): boolean => {
  const r = token['role'];
  const ra = token['roleAssigned'];
  if (typeof r !== 'string' || typeof ra !== 'boolean') return true;
  const ttlRaw = process.env['AUTH_TOKEN_REFRESH_TTL_MS'];
  const ttl = Number.parseInt(ttlRaw ?? '300000', 10);
  const last = Number(token['authRefreshedAt'] ?? 0);
  return Date.now() - last > ttl;
};

const getUpdatedToken = async (uid: string, token: JWT): Promise<JWT> => {
  const [access, sec] = await Promise.all([getAuthAccessForUser(uid), getAuthSecurityProfile(uid)]);
  return {
    ...token,
    role: access.roleId,
    permissions: access.permissions,
    roleLevel: access.level,
    isElevated: access.isElevated,
    roleAssigned: access.roleAssigned,
    accountDisabled: sec.disabledAt !== null,
    accountBanned: sec.bannedAt !== null,
    authRefreshedAt: Date.now(),
  };
};

const getSessionUser = (token: JWT, current: User): User => {
  return {
    ...current,
    id: String(token['sub'] ?? current.id),
    role: (token['role']) ?? null,
    permissions: (token['permissions']) ?? [],
    roleLevel: (token['roleLevel']) ?? null,
    isElevated: (token['isElevated']) ?? false,
    roleAssigned: (token['roleAssigned']) ?? false,
    accountDisabled: (token['accountDisabled']) ?? false,
    accountBanned: (token['accountBanned']) ?? false,
  };
};

const logSignInActivity = async (u: User): Promise<void> => {
  const uid = u.id;
  if (uid === undefined) return;
  const authUser = u as User & { activitySurface?: string; authFlow?: string; loginMethod?: string };
  const surface = authUser.activitySurface ?? '';
  if (surface.trim() !== 'kangur') return;
  await logActivity({
    type: ActivityTypes.AUTH.LOGIN,
    description: `User logged in: ${u.email ?? 'unknown'}`,
    userId: uid,
    entityId: uid,
    entityType: 'user',
    metadata: {
      surface: 'kangur',
      actorType: 'parent',
      authFlow: authUser.authFlow ?? null,
      loginMethod: authUser.loginMethod ?? null,
    },
  });
};

const buildAuthConfig = async (): Promise<NextAuthConfig> => {
  const providersPromise = buildProviders();
  const adapter = MongoDBAdapter(getMongoClient(), { databaseName: process.env['MONGODB_DB'] ?? 'app' });
  return {
    ...authConfig,
    adapter,
    providers: await providersPromise,
    callbacks: {
      ...(authConfig.callbacks ?? {}),
      async jwt({ token, user }): Promise<JWT> {
        const userId = user?.id ?? (token['sub']);
        if (userId === undefined || (user === undefined && !checkRefreshRequired(token))) return token;
        try {
          return await getUpdatedToken(userId, token);
        } catch (e: unknown) {
          await ErrorSystem.captureException(e, { service: 'auth', action: 'jwt_callback', userId });
          return token;
        }
      },
      session({ session, token }): Session {
        const updated = { ...session };
        if (updated.user !== undefined) {
          updated.user = getSessionUser(token, updated.user);
        }
        return updated;
      },
    },
    debug: process.env['AUTH_DEBUG'] === 'true',
    events: {
      async signIn({ user }) {
        await logSignInActivity(user);
      },
      async signOut(message) {
        const token = 'token' in message ? (message.token) : null;
        const sub = token ? (token['sub']) : undefined;
        if (sub !== undefined && sub !== null) {
          await logActivity({ type: ActivityTypes.AUTH.LOGOUT, description: 'User logged out', userId: sub });
        }
      },
    },
  };
};

const getAuthConfig = async (): Promise<NextAuthConfig> => {
  const ttlRaw = process.env['AUTH_CONFIG_TTL_MS'];
  const ttl = Number.parseInt(ttlRaw ?? '600000', 10);
  if (cachedAuthConfig !== null && Date.now() - cachedAuthConfigAt < ttl) return cachedAuthConfig;
  if (cachedAuthConfigPromise !== null) return cachedAuthConfigPromise;
  cachedAuthConfigPromise = buildAuthConfig().then((config) => {
    cachedAuthConfig = config;
    cachedAuthConfigAt = Date.now();
    return config;
  }).finally(() => { cachedAuthConfigPromise = null; });
  return cachedAuthConfigPromise;
};

let cachedAuthConfig: NextAuthConfig | null = null;
let cachedAuthConfigAt = 0;
let cachedAuthConfigPromise: Promise<NextAuthConfig> | null = null;
export const { handlers, auth, signIn, signOut } = NextAuth(getAuthConfig);
