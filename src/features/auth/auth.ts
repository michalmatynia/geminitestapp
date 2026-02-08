import 'server-only';

import { MongoDBAdapter } from '@auth/mongodb-adapter';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import NextAuth, { type NextAuthConfig, type Session, type User } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Facebook from 'next-auth/providers/facebook';
import Google from 'next-auth/providers/google';

import { getAuthAccessForUser } from '@/features/auth/services/auth-access';
import { consumeLoginChallenge } from '@/features/auth/services/auth-login-challenge';
import { getAuthDataProvider, requireAuthProvider } from '@/features/auth/services/auth-provider';
import {
  checkLoginAllowed,
  extractClientIp,
  recordLoginFailure,
  recordLoginSuccess,
} from '@/features/auth/services/auth-security';
import { getAuthSecurityProfile, updateAuthSecurityProfile } from '@/features/auth/services/auth-security-profile';
import { getAuthUserPageSettings } from '@/features/auth/services/auth-settings';
import { hashRecoveryCode, verifyTotpToken } from '@/features/auth/services/totp';
import { decryptAuthSecret } from '@/features/auth/utils/auth-encryption';
import { ActivityTypes, ErrorSystem, logActivity } from '@/features/observability/server';
import { getMongoClient } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

import { authConfig } from './auth.config';
import { findAuthUserByEmail, findAuthUserById } from './services/auth-user-service';

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
  },
  async authorize(credentials: Record<string, unknown> | null, request: Request) {
    try {
      const email = credentials?.email?.toString() ?? '';
      const password = credentials?.password?.toString() ?? '';
      const otp = credentials?.otp?.toString() ?? '';
      const recoveryCode = credentials?.recoveryCode?.toString() ?? '';
      const challengeId = credentials?.challengeId?.toString() ?? '';
      if (!email || !password) {
        console.log('[AUTH] Missing email or password');
        return null;
      }
      const ip = extractClientIp(request);
      const allowed = await checkLoginAllowed({ email, ip });
      if (!allowed.allowed) {
        await ErrorSystem.logWarning('[AUTH] Login blocked due to rate limits', {
          service: 'auth',
          email,
          ip,
          lockedUntil: allowed.lockedUntil?.toISOString(),
        });
        return null;
      }

      if (challengeId) {
        const challenge = await consumeLoginChallenge({
          id: challengeId,
          email,
          ip,
        });
        if (challenge) {
          const user = await findAuthUserById(challenge.userId);
          if (!user) {
            await recordLoginFailure({ email, ip, request });
            return null;
          }

          const security = await getAuthSecurityProfile(user.id);
          const settings = await getAuthUserPageSettings();

          if (security.bannedAt) {
            await recordLoginFailure({ email, ip, request });
            return null;
          }
          if (security.disabledAt) {
            await recordLoginFailure({ email, ip, request });
            return null;
          }
          if (
            settings.requireEmailVerification &&
            !user.emailVerified
          ) {
            await recordLoginFailure({ email, ip, request });
            return null;
          }
          if (security.allowedIps.length > 0 && ip) {
            const allowedSet = new Set(security.allowedIps);
            if (!allowedSet.has(ip)) {
              await recordLoginFailure({ email, ip, request });
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
                const nextCodes = security.recoveryCodes.filter(
                  (code: string) => code !== hashed
                );

                await updateAuthSecurityProfile(user.id, {
                  recoveryCodes: nextCodes,
                });
                mfaOk = true;
              }
            } else if (providedOtp && security.mfaSecret) {
              const secret = decryptAuthSecret(security.mfaSecret);
              mfaOk = verifyTotpToken(secret, providedOtp);
            }
            if (!mfaOk) {
              await recordLoginFailure({ email, ip, request });
              return null;
            }
          }

          await recordLoginSuccess({ email, ip, request, userId: user.id });
          return {
            id: user.id,
            email: user.email,
            name: user.name ?? null,
            image: user.image ?? null,
          };
        }
      }

      await ErrorSystem.logInfo('[AUTH] Attempting to find user', { service: 'auth', email });
      
      // findAuthUserByEmail reads from MongoDB-backed auth store
      const user = await findAuthUserByEmail(email);

      if (!user) {
        await ErrorSystem.logInfo('[AUTH] User not found', { service: 'auth', email });
        await recordLoginFailure({ email, ip, request });
        return null;
      }

      const security = await getAuthSecurityProfile(user.id);
      const settings = await getAuthUserPageSettings();

      if (security.bannedAt) {
        await recordLoginFailure({ email, ip, request });
        return null;
      }
      if (security.disabledAt) {
        await recordLoginFailure({ email, ip, request });
        return null;
      }
      if (settings.requireEmailVerification && !user.emailVerified) {
        await recordLoginFailure({ email, ip, request });
        return null;
      }
      if (security.allowedIps.length > 0 && ip) {
        const allowedSet = new Set(security.allowedIps);
        if (!allowedSet.has(ip)) {
          await recordLoginFailure({ email, ip, request });
          return null;
        }
      }
      
      if (!user.passwordHash) {
        console.log('[AUTH] User has no password hash');
        await recordLoginFailure({ email, ip, request });
        return null;
      }

      console.log(`[AUTH] User found: ${user.id}. Hash len: ${user.passwordHash.length}. Input pass len: ${password.length}`);
      const isValid = await bcrypt.compare(password, user.passwordHash);
      console.log('[AUTH] Password valid:', isValid);
      
      if (!isValid) {
        await recordLoginFailure({ email, ip, request });
        return null;
      }

      if (security.mfaEnabled) {
        const providedRecovery = recoveryCode.trim();
        const providedOtp = otp.trim();
        let mfaOk = false;
        if (providedRecovery) {
          const hashed = hashRecoveryCode(providedRecovery);
          if (security.recoveryCodes.includes(hashed)) {
            const nextCodes = security.recoveryCodes.filter(
              (code: string) => code !== hashed
            );

            await updateAuthSecurityProfile(user.id, {
              recoveryCodes: nextCodes,
            });
            mfaOk = true;
          }
        } else if (providedOtp && security.mfaSecret) {
          const secret = decryptAuthSecret(security.mfaSecret);
          mfaOk = verifyTotpToken(secret, providedOtp);
        }
        if (!mfaOk) {
          await recordLoginFailure({ email, ip, request });
          return null;
        }
      }

      await recordLoginSuccess({ email, ip, request, userId: user.id });

      return {
        id: user.id,
        email: user.email,
        name: user.name ?? null,
        image: user.image ?? null,
      };
    } catch (error) {
      await ErrorSystem.captureException(error, {
        service: 'auth',
        action: 'authorize',
      });
      return null;
    }
  },
});

const buildProviders = (): Provider[] => {
  const providers: Provider[] = [credentialsProvider];
  
  if (process.env['GOOGLE_CLIENT_ID'] && process.env['GOOGLE_CLIENT_SECRET']) {
    providers.push(
      Google({
        clientId: process.env['GOOGLE_CLIENT_ID'],
        clientSecret: process.env['GOOGLE_CLIENT_SECRET'],
      })
    );
  } else {
    // Non-critical warning, log to system but don't spam if not configured
    void ErrorSystem.logWarning('[AUTH] Google Client ID/Secret not found. Google login will be unavailable.', {
      service: 'auth',
      provider: 'google'
    });
  }

  if (process.env['FACEBOOK_CLIENT_ID'] && process.env['FACEBOOK_CLIENT_SECRET']) {
    providers.push(
      Facebook({
        clientId: process.env['FACEBOOK_CLIENT_ID'],
        clientSecret: process.env['FACEBOOK_CLIENT_SECRET'],
      })
    );
  } else {
    void ErrorSystem.logWarning('[AUTH] Facebook Client ID/Secret not found. Facebook login will be unavailable.', {
      service: 'auth',
      provider: 'facebook'
    });
  }

  return providers;
};

const buildAuthConfig = async (): Promise<NextAuthConfig> => {
  try {
    const authLoggingEnabled = process.env['AUTH_LOGGING'] === 'true';
    if (authLoggingEnabled) {
      await ErrorSystem.logInfo('[AUTH] Starting configuration...', { service: 'auth' });
    }
    const configuredProvider = await getAuthDataProvider();
    const provider = requireAuthProvider(configuredProvider);
    let adapter: ReturnType<typeof PrismaAdapter> | ReturnType<typeof MongoDBAdapter> | undefined;
    try {
      adapter =
        provider === 'prisma'
          ? PrismaAdapter(prisma)
          : MongoDBAdapter(getMongoClient(), { databaseName: process.env['MONGODB_DB'] ?? 'app' });
    } catch (error) {
      await ErrorSystem.logWarning('[AUTH] Adapter initialization failed; attempting fallback.', {
        service: 'auth',
        provider,
        error,
      });
      if (provider === 'mongodb' && process.env['DATABASE_URL']) {
        try {
          adapter = PrismaAdapter(prisma);
        } catch (fallbackError) {
          await ErrorSystem.logWarning('[AUTH] Prisma adapter fallback failed.', {
            service: 'auth',
            provider: 'prisma',
            error: fallbackError,
          });
        }
      } else if (provider === 'prisma' && process.env['MONGODB_URI']) {
        try {
          adapter = MongoDBAdapter(getMongoClient(), { databaseName: process.env['MONGODB_DB'] ?? 'app' });
        } catch (fallbackError) {
          await ErrorSystem.logWarning('[AUTH] Mongo adapter fallback failed.', {
            service: 'auth',
            provider: 'mongodb',
            error: fallbackError,
          });
        }
      }
    }
    if (authLoggingEnabled) {
      console.log(`[AUTH] Adapter configured for ${provider}.`);
    }

    return {
      ...authConfig,
      ...(adapter && { adapter }),
      providers: buildProviders(),
      callbacks: {
        ...(authConfig.callbacks ?? {}),
        async jwt({ token, user }: { token: JWT; user?: User }): Promise<JWT> {
          const userId = user?.id ?? token.sub;
          if (!userId) return token;

          const tokenMeta = token as JWT & { authRefreshedAt?: number };
          const now = Date.now();
          const refreshTtlMs = Number.parseInt(process.env['AUTH_TOKEN_REFRESH_TTL_MS'] ?? '60000', 10);
          const lastRefresh = typeof tokenMeta.authRefreshedAt === 'number' ? tokenMeta.authRefreshedAt : 0;
          const hasRole = typeof tokenMeta.role === 'string' && tokenMeta.role.length > 0;
          const shouldRefresh = Boolean(user) || !hasRole || now - lastRefresh > refreshTtlMs;

          if (!shouldRefresh) return token;

          try {
            const access = await getAuthAccessForUser(userId);
            token.role = access.roleId;
            token.permissions = access.permissions;
            token.roleLevel = access.level;
            token.isElevated = access.isElevated;
            const security = await getAuthSecurityProfile(userId);
            token.accountDisabled = Boolean(security.disabledAt);
            token.accountBanned = Boolean(security.bannedAt);
            tokenMeta.authRefreshedAt = now;
          } catch (error) {
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
            void logActivity({
              type: ActivityTypes.AUTH.LOGIN,
              description: `User logged in: ${user.email}`,
              userId: user.id,
              entityId: user.id,
              entityType: 'user',
            }).catch(() => {});
          }
        },
        async signOut({ token }) {
          if (token?.sub) {
            void logActivity({
              type: ActivityTypes.AUTH.LOGOUT,
              description: 'User logged out',
              userId: token.sub,
            }).catch(() => {});
          }
        },
      },
    };
  } catch (error: unknown) {
    await ErrorSystem.captureException(error, {
      service: 'auth',
      action: 'configuration',
    });
    throw error;
  }
};

const AUTH_CONFIG_TTL_MS = 30_000;
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
  
