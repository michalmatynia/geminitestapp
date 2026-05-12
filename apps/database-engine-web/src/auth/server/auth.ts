import 'server-only';

import bcrypt from 'bcryptjs';
import NextAuth, { type Session, type User } from 'next-auth';
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

const isCredentialMissing = (credentials: AuthCredentials): boolean => {
  return (
    credentials.email.length === 0 ||
    credentials.password === undefined ||
    credentials.password.length === 0
  );
};

const getUserPasswordHash = (
  user: Awaited<ReturnType<typeof findAuthUserByEmail>> | null | undefined
): string | undefined => {
  const passwordHash = user?.passwordHash;
  return typeof passwordHash === 'string' && passwordHash.length > 0 ? passwordHash : undefined;
};

const validateCredentials = async (credentials: AuthCredentials): Promise<User | null> => {
  if (isCredentialMissing(credentials)) {
    return null;
  }

  const user = await findAuthUserByEmail(credentials.email);
  if (user === null) return null;
  const passwordHash = getUserPasswordHash(user);
  if (passwordHash === undefined) return null;

  const { password } = credentials;
  if (password === undefined) return null;

  const passwordOk = await bcrypt.compare(password, passwordHash);
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

const isRoleAssigned = (value: unknown): boolean => value === true || value === 'true';
const isBoolFlag = (value: unknown): boolean => value === true;

const getSessionUserPermissions = (token: JWT, current: User): string[] => {
  const permissions = token.permissions;
  if (!Array.isArray(permissions)) return current.permissions ?? [];

  return permissions.filter((permission): permission is string => typeof permission === 'string');
};

const getSessionUserId = (token: JWT, current: User): string => {
  const tokenSub = token.sub;
  return typeof tokenSub === 'string' && tokenSub.length > 0 ? tokenSub : String(current.id ?? '');
};

const getSessionUserRole = (token: JWT, current: User): string | null => {
  if (typeof token.role === 'string' && token.role.length > 0) return token.role;
  return current.role ?? null;
};

const getSessionUserRoleLevel = (token: JWT, current: User): number | null => {
  if (typeof token.roleLevel === 'number') return token.roleLevel;
  return current.roleLevel ?? null;
};

const getSessionUser = (token: JWT, current: User): NonNullable<Session['user']> => ({
  ...current,
  id: getSessionUserId(token, current),
  role: getSessionUserRole(token, current),
  permissions: getSessionUserPermissions(token, current),
  roleLevel: getSessionUserRoleLevel(token, current),
  isElevated: isBoolFlag(token.isElevated),
  roleAssigned: isRoleAssigned(token.roleAssigned),
  accountDisabled: isBoolFlag(token.accountDisabled),
  accountBanned: isBoolFlag(token.accountBanned),
});

const shouldRefreshJwt = (user: User | undefined, token: JWT): boolean => {
  return user === undefined ? shouldRefreshToken(token) : true;
};

const refreshJwtToken = async (userId: string, token: JWT, shouldRefresh: boolean): Promise<JWT> => {
  if (!shouldRefresh) return token;
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
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [credentialsProvider],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }: { token: JWT; user?: User }): Promise<JWT> {
      const userId = user === undefined ? token.sub : user.id;
      if (userId === undefined || userId === '') return token;
      return refreshJwtToken(userId, token, shouldRefreshJwt(user, token));
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
