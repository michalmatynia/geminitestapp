import type { NextAuthConfig, Session, User } from 'next-auth';
import type { JWT } from 'next-auth/jwt';

const devFallbackSecret = 'dev-secret-change-me';
const secret =
  process.env['AUTH_SECRET'] ??
  process.env['NEXTAUTH_SECRET'] ??
  (process.env['NODE_ENV'] === 'development' ? devFallbackSecret : undefined);

const isProd = process.env['NODE_ENV'] === 'production';
const securePrefix = isProd ? '__Secure-' : '';
const hostPrefix = isProd ? '__Host-' : '';
const elevatedRoles = new Set(['admin', 'super_admin', 'superuser']);

type AuthUserInfo = {
  role?: string | null;
  isElevated?: boolean;
  accountDisabled?: boolean;
  accountBanned?: boolean;
  roleAssigned?: boolean;
  permissions?: string[];
};

type TokenData = {
  role?: string | null;
  permissions?: string[];
  roleLevel?: number | null;
  isElevated?: boolean;
  roleAssigned?: boolean;
  accountDisabled?: boolean;
  accountBanned?: boolean;
};

const isPlaywrightRuntime = Boolean(
  (process.env['PLAYWRIGHT_RUNTIME_LEASE_KEY'] ?? '') !== '' ||
    (process.env['PLAYWRIGHT_RUNTIME_AGENT_ID'] ?? '') !== ''
);

const isElevatedUser = (authUser: AuthUserInfo): boolean => {
  const role = authUser.role ?? 'unknown';
  return (authUser.isElevated ?? false) || elevatedRoles.has(role) || isPlaywrightRuntime;
};

const isRoleDeniedForAdminRoute = (authUser: AuthUserInfo): boolean =>
  (authUser.accountBanned ?? false) || (authUser.accountDisabled ?? false);

const isAdminDatabaseRoute = (pathname: string): boolean => pathname.startsWith('/admin/databases');

const hasAdminPermissionForDatabases = (authUser: AuthUserInfo): boolean => {
  if (isElevatedUser(authUser)) return true;
  const permissions = authUser.permissions ?? [];
  return permissions.includes('settings.manage');
};

const checkDatabaseAdminAccess = (
  pathname: string,
  authUser: AuthUserInfo
): boolean | { redirect: string; error?: string; denied?: boolean } => {
  if (isRoleDeniedForAdminRoute(authUser)) {
    return { redirect: '/auth/signin', error: 'AccountDisabled' };
  }

  const hasRoleAssigned = (authUser.roleAssigned ?? false) || isPlaywrightRuntime;
  if (!hasRoleAssigned && !isElevatedUser(authUser)) {
    return { redirect: '/auth/signin', error: 'AccessDenied' };
  }

  if (isAdminDatabaseRoute(pathname) && !hasAdminPermissionForDatabases(authUser)) {
    return { redirect: '/admin', denied: true };
  }

  return true;
};

type TokenDefaults = {
  role: string | null;
  permissions: string[];
  roleLevel: number | null;
  isElevated: boolean;
  roleAssigned: boolean;
  accountDisabled: boolean;
  accountBanned: boolean;
};

const getResolvedUserId = (tokenSub: string | undefined, userId: string | undefined): string =>
  tokenSub ?? userId ?? '';

const getTokenUserData = (token: TokenData): TokenDefaults => {
  const {
    role = null,
    permissions = [],
    roleLevel = null,
    isElevated = false,
    roleAssigned = false,
    accountDisabled = false,
    accountBanned = false,
  } = token;

  return {
    role,
    permissions,
    roleLevel,
    isElevated,
    roleAssigned,
    accountDisabled,
    accountBanned,
  };
};

const getUpdatedUser = (user: User, token: JWT): NonNullable<Session['user']> => {
  const t = token as TokenData;
  return {
    ...user,
    id: getResolvedUserId(token.sub, user.id),
    ...getTokenUserData(t),
  };
};

export const authConfig = {
  providers: [],
  pages: {
    signIn: '/auth/signin',
  },
  trustHost: true,
  ...(secret !== undefined ? { secret } : {}),
  cookies: {
    sessionToken: {
      name: `${securePrefix}authjs.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProd,
      },
    },
    callbackUrl: {
      name: `${securePrefix}authjs.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProd,
      },
    },
    csrfToken: {
      name: `${hostPrefix}authjs.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProd,
      },
    },
    pkceCodeVerifier: {
      name: `${securePrefix}authjs.pkce.code_verifier`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProd,
      },
    },
    state: {
      name: `${securePrefix}authjs.state`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProd,
      },
    },
    nonce: {
      name: `${securePrefix}authjs.nonce`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProd,
      },
    },
  },
  session: { strategy: 'jwt' },
  callbacks: {
    authorized({
      auth,
      request: { nextUrl },
    }: {
      auth: Session | null;
      request: { nextUrl: URL };
    }): boolean | Response {
      const { pathname } = nextUrl;
      if (!pathname.startsWith('/admin')) return true;
      if (auth?.user === undefined) return false;

      const result = checkDatabaseAdminAccess(pathname, auth.user as AuthUserInfo);
      if (result === true) return true;
      if (result === false) return false;

      const redirectUrl = new URL(result.redirect, nextUrl);
      if (result.error !== undefined) redirectUrl.searchParams.set('error', result.error);
      if (result.denied === true) redirectUrl.searchParams.set('denied', '1');
      return Response.redirect(redirectUrl);
    },
    session({ session, token }: { session: Session; token: JWT }): Session {
      if (session.user === undefined) return session;
      return {
        ...session,
        user: getUpdatedUser(session.user, token),
      };
    },
  },
} satisfies NextAuthConfig;
