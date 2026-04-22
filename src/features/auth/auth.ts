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
import { configurationError } from '@/shared/errors/app-error';
import { getAuthDataProvider, requireAuthProvider } from '@/shared/lib/auth/services/auth-provider';
import { getAuthOAuthSecrets } from '@/shared/lib/auth/auth-secret-settings';
import { getMongoClient } from '@/shared/lib/db/mongo-client';
import { decryptAuthSecret } from '@/shared/lib/security/encryption';
import { logActivity } from '@/shared/utils/observability/activity-service';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { authConfig } from './auth.config';
import { findAuthUserByEmail, findAuthUserById } from './services/auth-user-service';

import type { AdapterSession } from '@auth/core/adapters';
import type { JWT } from 'next-auth/jwt';
import type { Provider } from 'next-auth/providers';

const credentialsProvider = Credentials({
  name: 'Credentials',
  credentials: {
    email: { label: 'Email', type: 'email' },
    password: { label: 'Password', type: 'password' },
    otp: { label: 'One-time code', type: 'text' },
    recoveryCode: { label: 'Recovery code', type: 'text' },
    challengeId: { label: 'Challenge', type: 'text' },
    authFlow: { label: 'Auth flow', type: 'text' },
  },
  async authorize(credentials: Record<string, unknown> | null, request: Request) {
    try {
      const email = credentials?.['email']?.toString() ?? '';
      const password = credentials?.['password']?.toString() ?? '';
      const otp = credentials?.['otp']?.toString() ?? '';
      const recoveryCode = credentials?.['recoveryCode']?.toString() ?? '';
      const challengeId = credentials?.['challengeId']?.toString() ?? '';
      const authFlow = credentials?.['authFlow']?.toString().trim() ?? '';

      if (!email || (!password && !challengeId)) {
        // Log non-critical info without awaiting
        ErrorSystem.logInfo('[AUTH] Missing email or primary auth factor', { service: 'auth' }).catch(() => {});
        return null;
      }

      const ip = extractClientIp(request);

      let challengeResultPromise: Promise<{
        challenge: Awaited<ReturnType<typeof consumeLoginChallenge>> | null;
        user: Awaited<ReturnType<typeof findAuthUserById>> | Awaited<ReturnType<typeof findAuthUserByEmail>>;
      }>;

      if (challengeId) {
        challengeResultPromise = consumeLoginChallenge({ id: challengeId, email, ip }).then(
          async (challenge) => ({
            challenge,
            user: challenge ? await findAuthUserById(challenge.userId) : null,
          })
        );
      } else {
        challengeResultPromise = findAuthUserByEmail(email).then((user) => ({
          challenge: null,
          user,
        }));
      }

      const [allowed, challengeResult] = await Promise.all([
        checkLoginAllowed({ email, ip }),
        challengeResultPromise,
      ]);
      const user = challengeResult.user;
      const challenge = challengeResult.challenge;

      if (!allowed.allowed) {
        ErrorSystem.logWarning('[AUTH] Login blocked due to rate limits', {
          service: 'auth',
          email,
          ip,
          lockedUntil: allowed.lockedUntil?.toISOString(),
        }).catch(() => {});
        return null;
      }

      if (!user) {
        ErrorSystem.logInfo('[AUTH] User not found or challenge invalid', {
          service: 'auth',
          email,
        }).catch(() => {});
        recordLoginFailure({ email, ip, request }).catch(() => {});
        return null;
      }

      // Parallelize profile fetching
      const [security, settings] = await Promise.all([
        getAuthSecurityProfile(user.id),
        getAuthUserPageSettings(),
      ]);
      const requiresVerifiedEmail = settings.requireEmailVerification || authFlow === 'kangur_parent';

      if (security.bannedAt || security.disabledAt) {
        recordLoginFailure({ email, ip, request }).catch(() => {});
        return null;
      }
      if (requiresVerifiedEmail && !user.emailVerified) {
        recordLoginFailure({ email, ip, request }).catch(() => {});
        return null;
      }
      if (security.allowedIps.length > 0 && ip) {
        const allowedSet = new Set(security.allowedIps);
        if (!allowedSet.has(ip)) {
          recordLoginFailure({ email, ip, request }).catch(() => {});
          return null;
        }
      }

      // If challenge was used, we skip password check as it was verified during challenge creation
      // But we still verify MFA if enabled
      if (!challengeId) {
        if (!user.passwordHash) {
          ErrorSystem.logWarning('[AUTH] User has no password hash', {
            service: 'auth',
            userId: user.id,
          }).catch(() => {});
          recordLoginFailure({ email, ip, request }).catch(() => {});
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);

        if (!isValid) {
          recordLoginFailure({ email, ip, request }).catch(() => {});
          return null;
        }
      }

      if (security.mfaEnabled) {
        const providedRecovery = recoveryCode.trim();
        const providedOtp = otp.trim();
        let mfaOk = false;

        if (providedRecovery) {
          const hashed = hashRecoveryCode(providedRecovery);
          if (security.recoveryCodes.includes(hashed)) {
            const nextCodes = security.recoveryCodes.filter((code: string) => code !== hashed);
            // Update codes in background
            updateAuthSecurityProfile(user.id, {
              recoveryCodes: nextCodes,
            }).catch(() => {});
            mfaOk = true;
          }
        } else if (providedOtp && security.mfaSecret) {
          const secret = decryptAuthSecret(security.mfaSecret);
          mfaOk = verifyTotpToken(secret, providedOtp);
        }

        if (!mfaOk) {
          recordLoginFailure({ email, ip, request }).catch(() => {});
          return null;
        }
      }

      recordLoginSuccess({ email, ip, request, userId: user.id }).catch(() => {});

      const loginMethod = challenge?.purpose === 'magic_login' ? 'magic_link' : 'password';
      const activitySurface = authFlow === 'kangur_parent' ? 'kangur' : null;

      return {
        id: user.id,
        email: user.email,
        name: user.name ?? null,
        image: user.image ?? null,
        ...(activitySurface
          ? {
            activitySurface,
            authFlow,
            loginMethod,
          }
          : {}),
      };
    } catch (error) {
      ErrorSystem.captureException(error).catch(() => {});
      ErrorSystem.captureException(error, {
        service: 'auth',
        action: 'authorize',
      }).catch(() => {});
      return null;
    }
  },
});

const buildProviders = async (): Promise<Provider[]> => {
  const providers: Provider[] = [credentialsProvider];
  const oauthSecrets = await getAuthOAuthSecrets();

  if (oauthSecrets.google.clientId && oauthSecrets.google.clientSecret) {
    providers.push(
      Google({
        clientId: oauthSecrets.google.clientId,
        clientSecret: oauthSecrets.google.clientSecret,
      })
    );
  } else {
    // Non-critical warning, log to system but don't spam if not configured
    ErrorSystem.logWarning(
      '[AUTH] Google Client ID/Secret not found. Google login will be unavailable.',
      {
        service: 'auth',
        provider: 'google',
      }
    ).catch(() => {});
  }

  if (oauthSecrets.facebook.clientId && oauthSecrets.facebook.clientSecret) {
    providers.push(
      Facebook({
        clientId: oauthSecrets.facebook.clientId,
        clientSecret: oauthSecrets.facebook.clientSecret,
      })
    );
  } else {
    ErrorSystem.logWarning(
      '[AUTH] Facebook Client ID/Secret not found. Facebook login will be unavailable.',
      {
        service: 'auth',
        provider: 'facebook',
      }
    ).catch(() => {});
  }

  return providers;
};

const buildAuthConfig = async (): Promise<NextAuthConfig> => {
  try {
    const authLoggingEnabled = process.env['AUTH_LOGGING'] === 'true';
    if (authLoggingEnabled) {
      await ErrorSystem.logInfo('[AUTH] Starting configuration...', { service: 'auth' });
    }
    const providersPromise = buildProviders();
    const provider = requireAuthProvider(await getAuthDataProvider());
    let adapter: ReturnType<typeof MongoDBAdapter> | undefined;
    try {
      adapter = MongoDBAdapter(getMongoClient(), {
        databaseName: process.env['MONGODB_DB'] ?? 'app',
      });
    } catch (error) {
      ErrorSystem.captureException(error).catch(() => {});
      await ErrorSystem.logWarning('[AUTH] Adapter initialization failed.', {
        service: 'auth',
        provider,
        error,
      });
      throw configurationError(`[AUTH] Adapter initialization failed for "${provider}".`);
    }
    if (authLoggingEnabled) {
      await ErrorSystem.logInfo(`[AUTH] Adapter configured for ${provider}.`, {
        service: 'auth',
        provider,
      });
    }

    return {
      ...authConfig,
      ...(adapter && { adapter }),
      providers: await providersPromise,
      callbacks: {
        ...(authConfig.callbacks ?? {}),
        async jwt({ token, user }: { token: JWT; user?: User }): Promise<JWT> {
          const userId = user?.id ?? token.sub;
          if (!userId) return token;

          const tokenMeta = token as JWT & { authRefreshedAt?: number };
          const now = Date.now();
          const refreshTtlMs = Number.parseInt(
            process.env['AUTH_TOKEN_REFRESH_TTL_MS'] ?? '300000',
            10
          );
          const lastRefresh =
            typeof tokenMeta.authRefreshedAt === 'number' ? tokenMeta.authRefreshedAt : 0;
          const hasRole = typeof tokenMeta.role === 'string' && tokenMeta.role.length > 0;
          const hasRoleAssigned = typeof tokenMeta.roleAssigned === 'boolean';
          const shouldRefresh =
            Boolean(user) || !hasRole || !hasRoleAssigned || now - lastRefresh > refreshTtlMs;

          if (!shouldRefresh) return token;

          try {
            const access = await getAuthAccessForUser(userId);
            token.role = access.roleId;
            token.permissions = access.permissions;
            token.roleLevel = access.level;
            token.isElevated = access.isElevated;
            token.roleAssigned = access.roleAssigned;
            const security = await getAuthSecurityProfile(userId);
            token.accountDisabled = Boolean(security.disabledAt);
            token.accountBanned = Boolean(security.bannedAt);
            tokenMeta.authRefreshedAt = now;
          } catch (error) {
            ErrorSystem.captureException(error).catch(() => {});
            await ErrorSystem.captureException(error, {
              service: 'auth',
              action: 'jwt_callback',
              userId,
            });
          }
          return token;
        },
        session({ session, token }: { session: Session; token: JWT }): Session {
          if (session.user) {
            if (token.sub) {
              session.user.id = token.sub;
            }
            session.user.role = (token.role as string) ?? null;
            session.user.permissions = (token.permissions as string[]) ?? [];
            session.user.roleLevel = (token.roleLevel as number) ?? null;
            session.user.isElevated = (token.isElevated as boolean) ?? false;
            session.user.roleAssigned = (token.roleAssigned as boolean) ?? false;
            session.user.accountDisabled = (token.accountDisabled as boolean) ?? false;
            session.user.accountBanned = (token.accountBanned as boolean) ?? false;
          }
          return session;
        },
      },
      debug: process.env['AUTH_DEBUG'] === 'true',
      events: {
        async signIn({ user }) {
          if (user?.id) {
            const authActivityUser = user as User & {
              activitySurface?: string | null;
              authFlow?: string | null;
              loginMethod?: string | null;
            };
            const activitySurface =
              typeof authActivityUser.activitySurface === 'string'
                ? authActivityUser.activitySurface.trim()
                : null;
            const authFlow =
              typeof authActivityUser.authFlow === 'string'
                ? authActivityUser.authFlow.trim()
                : null;
            const loginMethod =
              typeof authActivityUser.loginMethod === 'string'
                ? authActivityUser.loginMethod.trim()
                : null;
            logActivity({
              type: ActivityTypes.AUTH.LOGIN,
              description: `User logged in: ${user.email}`,
              userId: user.id,
              entityId: user.id,
              entityType: 'user',
              metadata:
                activitySurface === 'kangur'
                  ? {
                    surface: 'kangur',
                    actorType: 'parent',
                    authFlow,
                    loginMethod,
                  }
                  : null,
            }).catch(() => {}).catch(() => {});
          }
        },
        async signOut(
          message: { session: void | AdapterSession | null | undefined } | { token: JWT | null }
        ) {
          if ('token' in message && message.token?.sub) {
            logActivity({
              type: ActivityTypes.AUTH.LOGOUT,
              description: 'User logged out',
              userId: message.token.sub,
            }).catch(() => {}).catch(() => {});
          }
        },
      },
    };
  } catch (error: unknown) {
    ErrorSystem.captureException(error).catch(() => {});
    await ErrorSystem.captureException(error, {
      service: 'auth',
      action: 'configuration',
    });
    throw error;
  }
};

const readPositiveIntegerEnv = (key: string, fallback: number): number => {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

const AUTH_CONFIG_TTL_MS = readPositiveIntegerEnv('AUTH_CONFIG_TTL_MS', 10 * 60_000);
let cachedAuthConfig: NextAuthConfig | null = null;
let cachedAuthConfigAt = 0;
let cachedAuthConfigPromise: Promise<NextAuthConfig> | null = null;

const getAuthConfig = async (): Promise<NextAuthConfig> => {
  const now = Date.now();
  if (cachedAuthConfig && now - cachedAuthConfigAt < AUTH_CONFIG_TTL_MS) {
    return cachedAuthConfig;
  }
  if (cachedAuthConfigPromise) {
    return cachedAuthConfigPromise;
  }
  cachedAuthConfigPromise = buildAuthConfig()
    .then((config: NextAuthConfig) => {
      cachedAuthConfig = config;
      cachedAuthConfigAt = Date.now();
      return config;
    })
    .finally(() => {
      cachedAuthConfigPromise = null;
    });
  return cachedAuthConfigPromise;
};

export const { handlers, auth, signIn, signOut } = NextAuth(getAuthConfig);
