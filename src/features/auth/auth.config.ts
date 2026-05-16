/**
 * NextAuth.js Configuration
 * 
 * Central authentication configuration for the application.
 * Handles:
 * - Session management and JWT tokens
 * - Role-based access control (RBAC)
 * - Permission-based route protection
 * - Account status validation (banned/disabled)
 * - Secure cookie configuration for production
 * - Development fallbacks for easier local testing
 * 
 * This configuration is edge-compatible and runs in middleware
 * to protect routes before they're rendered.
 */

import type { NextAuthConfig, Session, User } from 'next-auth';
import type { JWT } from 'next-auth/jwt';

type AuthSessionUser = NonNullable<Session['user']>;

// Secret key for JWT signing - required in production
const devFallbackSecret = 'dev-secret-change-me';
const secret =
  process.env['AUTH_SECRET'] ??
  process.env['NEXTAUTH_SECRET'] ??
  (process.env['NODE_ENV'] === 'development' ? devFallbackSecret : undefined);

// Environment detection for secure cookie configuration
const isProd = process.env['NODE_ENV'] === 'production';
const securePrefix = isProd ? '__Secure-' : ''; // Secure cookies in production
const hostPrefix = isProd ? '__Host-' : ''; // Host-locked cookies in production

// Warn in development if no secret is configured
if (
  process.env['NODE_ENV'] === 'development' &&
  process.env['AUTH_SECRET'] === undefined &&
  process.env['NEXTAUTH_SECRET'] === undefined
) {
  void (async (): Promise<void> => {
    const { logger } = await import('@/shared/utils/logger');
    logger.warn('[AUTH] AUTH_SECRET/NEXTAUTH_SECRET not set. Using dev fallback secret.');
  })();
}

/**
 * Route prefixes that require admin access
 * These routes are protected by role-based checks
 */
const adminOnlyPrefixes = ['/admin/auth', '/admin/products'];

/**
 * Roles that have elevated privileges
 * Users with these roles bypass some permission checks
 */
const elevatedRoles = new Set(['admin', 'super_admin', 'superuser']);

/**
 * Detect if running in Playwright test environment
 * Used to adjust auth behavior during automated testing
 */
const isPlaywrightRuntime = Boolean(
  (process.env['PLAYWRIGHT_RUNTIME_LEASE_KEY'] ?? '') !== '' ||
    (process.env['PLAYWRIGHT_RUNTIME_AGENT_ID'] ?? '') !== ''
);

/**
 * Permission rules mapping route prefixes to required permissions
 * Routes are checked in order, first match wins
 */
const permissionRules: Array<{ prefix: string; permissions: string[] }> = [
  { prefix: '/admin/auth/permissions', permissions: ['auth.users.write'] },
  { prefix: '/admin/auth/settings', permissions: ['auth.users.write'] },
  { prefix: '/admin/auth/users', permissions: ['auth.users.write'] },
  { prefix: '/admin/auth', permissions: ['auth.users.read'] },
  { prefix: '/admin/products', permissions: ['products.manage'] },
  { prefix: '/admin/drafts', permissions: ['products.manage'] },
  { prefix: '/admin/notes', permissions: ['notes.manage'] },
  { prefix: '/admin/chatbot', permissions: ['chatbot.manage'] },
  { prefix: '/admin/agentcreator', permissions: ['chatbot.manage'] },
  { prefix: '/admin/ai-paths', permissions: ['ai_paths.manage'] },
  { prefix: '/admin/image-studio', permissions: ['ai_paths.manage'] },
  { prefix: '/admin/integrations', permissions: ['settings.manage'] },
  { prefix: '/admin/system', permissions: ['settings.manage'] },
  { prefix: '/admin/settings', permissions: ['settings.manage'] },
  { prefix: '/admin/kangur', permissions: ['settings.manage'] },
  { prefix: '/admin/files', permissions: ['settings.manage'] },
  { prefix: '/admin/databases', permissions: ['settings.manage'] },
  { prefix: '/admin/front-manage', permissions: ['settings.manage'] },
  { prefix: '/admin/cms', permissions: ['settings.manage'] },
];

/**
 * Resolve required permissions for a given pathname
 * Returns the permissions array for the first matching rule
 */
const resolveRequiredPermissions = (pathname: string): string[] => {
  for (const rule of permissionRules) {
    if (pathname.startsWith(rule.prefix)) {
      return rule.permissions;
    }
  }
  return [];
};

/**
 * User authentication information interface
 * Extracted from session/JWT for authorization checks
 */
interface AuthUserInfo {
  role?: string;
  isElevated?: boolean;
  accountDisabled?: boolean;
  accountBanned?: boolean;
  roleAssigned?: boolean;
  permissions?: string[];
}

/**
 * Check if user account is in good standing
 * Returns redirect info if account is disabled or banned
 */
const checkAccountStatus = (
  authUser: AuthUserInfo
): { redirect: string; error: string } | undefined => {
  if (authUser.accountBanned === true || authUser.accountDisabled === true) {
    return { redirect: '/auth/signin', error: 'AccountDisabled' };
  }
  return undefined;
};

const isElevatedUser = (authUser: AuthUserInfo): boolean => {
  const role = authUser.role ?? 'unknown';
  return (authUser.isElevated ?? false) || elevatedRoles.has(role) || isPlaywrightRuntime;
};

const checkElevatedAccess = (
  pathname: string,
  authUser: AuthUserInfo
): { redirect: string; denied: boolean } | undefined => {
  if (adminOnlyPrefixes.some((prefix: string) => pathname.startsWith(prefix))) {
    if (!isElevatedUser(authUser)) {
      return { redirect: '/admin', denied: true };
    }
  }
  return undefined;
};

const checkPermissions = (
  pathname: string,
  authUser: AuthUserInfo
): { redirect: string; denied: boolean } | undefined => {
  const requiredPermissions = resolveRequiredPermissions(pathname);
  if (requiredPermissions.length === 0) return undefined;

  const permissions = authUser.permissions ?? [];
  const hasAccess =
    isElevatedUser(authUser) ||
    requiredPermissions.some((permission: string) => permissions.includes(permission));

  return hasAccess ? undefined : { redirect: '/admin', denied: true };
};

const checkAdminAccess = (
  pathname: string,
  authUser: AuthUserInfo
): boolean | { redirect: string; error?: string; denied?: boolean } => {
  const statusError = checkAccountStatus(authUser);
  if (statusError !== undefined) return statusError;

  const hasRoleAssigned = (authUser.roleAssigned ?? false) || isPlaywrightRuntime;
  if (!hasRoleAssigned) {
    return { redirect: '/auth/signin', error: 'AccessDenied' };
  }

  const elevatedError = checkElevatedAccess(pathname, authUser);
  if (elevatedError !== undefined) return elevatedError;

  const permissionsError = checkPermissions(pathname, authUser);
  if (permissionsError !== undefined) return permissionsError;

  return true;
};

interface TokenData {
  role?: string;
  permissions?: string[];
  roleLevel?: number;
  isElevated?: boolean;
  roleAssigned?: boolean;
  accountDisabled?: boolean;
  accountBanned?: boolean;
}

const getCoreUserData = (token: JWT, fallbackId: string): Partial<User> => {
  const t = token as TokenData;
  return {
    id: token.sub ?? fallbackId,
    role: t.role ?? null,
    permissions: t.permissions ?? [],
    roleLevel: t.roleLevel ?? null,
  };
};

const getUserStatusData = (token: JWT): Partial<User> => {
  const t = token as TokenData;
  return {
    isElevated: t.isElevated ?? false,
    roleAssigned: t.roleAssigned ?? false,
    accountDisabled: t.accountDisabled ?? false,
    accountBanned: t.accountBanned ?? false,
  };
};

const getUpdatedUser = (user: AuthSessionUser, token: JWT): AuthSessionUser => {
  return {
    ...user,
    ...getCoreUserData(token, user.id),
    ...getUserStatusData(token),
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
    }): boolean | Response | Promise<boolean | Response> {
      const { pathname } = nextUrl;
      if (!pathname.startsWith('/admin')) return true;
      if (auth?.user === undefined) return false;

      const result = checkAdminAccess(pathname, auth.user as AuthUserInfo);

      if (result === true) return true;
      if (result === false) return false;

      const redirectUrl = new URL(result.redirect, nextUrl);
      if (result.error !== undefined) {
        redirectUrl.searchParams.set('error', result.error);
      }
      if (result.denied === true) {
        redirectUrl.searchParams.set('denied', '1');
      }
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
