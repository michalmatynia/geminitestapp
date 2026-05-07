import 'server-only';

import bcrypt from 'bcryptjs';
import NextAuth, { type NextAuthConfig, type Session, type User } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { authConfig } from './auth.config';
import { getAuthAccessForUser } from './access';
import { findAuthUserByEmail } from './user-repository';

import type { JWT } from 'next-auth/jwt';

type AuthCredentials = {
  email: string;
  password?: string;
};

const getString = (credentials: Record<string, unknown> | null, key: string): string | undefined => {
  const value = credentials?.[key];
  return typeof value === 'string' ? value : undefined;
};

const extractCredentials = (credentials: Record<string, unknown> | null): AuthCredentials => ({
  email: getString(credentials, 'email')?.trim().toLowerCase() ?? '',
  password: getString(credentials, 'password'),
});

const validateCredentials = async (credentials: AuthCredentials): Promise<User | null> => {
  if (credentials.email === '' || !credentials.password) return null;

  const user = await findAuthUserByEmail(credentials.email);
  if (!user?.passwordHash) return null;

  const passwordOk = await bcrypt.compare(credentials.password, user.passwordHash);
  if (!passwordOk) return null;

  const access = await getAuthAccessForUser(user.id);
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    role: access.roleId,
    permissions: access.permissions,
    roleLevel: access.level,
    isElevated: access.isElevated,
    roleAssigned: access.roleAssigned,
    accountDisabled: false,
    accountBanned: false,
  };
};

const credentialsProvider = Credentials({
  name: 'Credentials',
  credentials: {},
  async authorize(credentials: Record<string, unknown> | null) {
    try {
      return await validateCredentials(extractCredentials(credentials));
    } catch (error) {
      await ErrorSystem.captureException(error, {
        service: 'database-engine.auth',
        action: 'authorize',
      });
      return null;
    }
  },
});

const shouldRefreshToken = (token: JWT): boolean => {
  const ttl = Number.parseInt(process.env['AUTH_TOKEN_REFRESH_TTL_MS'] ?? '300000', 10);
  const last = Number(token['authRefreshedAt'] ?? 0);
  if (typeof token.role !== 'string' || typeof token.roleAssigned !== 'boolean') return true;
  return Date.now() - last > (Number.isFinite(ttl) && ttl > 0 ? ttl : 300_000);
};

const refreshAccessToken = async (userId: string, token: JWT): Promise<JWT> => {
  const access = await getAuthAccessForUser(userId);
  return {
    ...token,
    role: access.roleId,
    permissions: access.permissions,
    roleLevel: access.level,
    isElevated: access.isElevated,
    roleAssigned: access.roleAssigned,
    accountDisabled: false,
    accountBanned: false,
    authRefreshedAt: Date.now(),
  };
};

const getSessionUser = (token: JWT, current: User): NonNullable<Session['user']> => ({
  ...current,
  id: String(token.sub ?? current.id ?? ''),
  role: token.role ?? null,
  permissions: token.permissions ?? [],
  roleLevel: token.roleLevel ?? null,
  isElevated: token.isElevated ?? false,
  roleAssigned: Boolean(token['roleAssigned'] ?? false),
  accountDisabled: token.accountDisabled ?? false,
  accountBanned: token.accountBanned ?? false,
});

const buildAuthConfig = (): NextAuthConfig => ({
  ...authConfig,
  providers: [credentialsProvider],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }): Promise<JWT> {
      const userId = user?.id ?? token.sub;
      if (userId === undefined || userId === '') return token;
      if (user === undefined && !shouldRefreshToken(token)) return token;
      try {
        return await refreshAccessToken(userId, token);
      } catch (error) {
        await ErrorSystem.captureException(error, {
          service: 'database-engine.auth',
          action: 'jwt_callback',
          userId,
        });
        return token;
      }
    },
    session({ session, token }): Session {
      return {
        ...session,
        user: getSessionUser(token, session.user),
      };
    },
  },
  debug: process.env['AUTH_DEBUG'] === 'true',
});

export const { handlers, auth, signIn, signOut } = NextAuth(buildAuthConfig());
