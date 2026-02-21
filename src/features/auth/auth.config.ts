import type { NextAuthConfig, Session } from 'next-auth';
import type { JWT } from 'next-auth/jwt';

const devFallbackSecret = 'dev-secret-change-me';
const secret =
  process.env['AUTH_SECRET'] ||
  process.env['NEXTAUTH_SECRET'] ||
  (process.env['NODE_ENV'] === 'development' ? devFallbackSecret : undefined);
const isProd = process.env['NODE_ENV'] === 'production';
const securePrefix = isProd ? '__Secure-' : '';
const hostPrefix = isProd ? '__Host-' : '';

if (
  process.env['NODE_ENV'] === 'development' &&
  !process.env['AUTH_SECRET'] &&
  !process.env['NEXTAUTH_SECRET']
) {
  void (async () => {
    const { logger } = await import('@/shared/utils/logger');
    logger.warn(
      '[AUTH] AUTH_SECRET/NEXTAUTH_SECRET not set. Using dev fallback secret.'
    );
  })();
}

// Basic config that is edge-compatible
const adminOnlyPrefixes = ['/admin/auth', '/admin/products'];
const elevatedRoles = new Set(['admin', 'super_admin', 'superuser']);

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
  { prefix: '/admin/files', permissions: ['settings.manage'] },
  { prefix: '/admin/databases', permissions: ['settings.manage'] },
  { prefix: '/admin/front-manage', permissions: ['settings.manage'] },
  { prefix: '/admin/cms', permissions: ['settings.manage'] },
];

const resolveRequiredPermissions = (pathname: string): string[] => {
  for (const rule of permissionRules) {
    if (pathname.startsWith(rule.prefix)) {
      return rule.permissions;
    }
  }
  return [];
};

export const authConfig = {
  providers: [], // Providers will be added in the main auth.ts or passed here
  pages: {
    signIn: '/auth/signin',
  },
  trustHost: true,
  ...(secret ? { secret } : {}),
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
      const isLoggedIn = !!auth?.user;
      const isOnAdmin = nextUrl.pathname.startsWith('/admin');
      if (isOnAdmin) {
        if (!isLoggedIn) return false;
        const authUser = auth?.user as {
          role?: string;
          isElevated?: boolean;
          accountDisabled?: boolean;
          accountBanned?: boolean;
        };
        const role = authUser?.role ?? 'unknown';
        const isElevated = authUser?.isElevated ?? elevatedRoles.has(role);
        if (authUser?.accountBanned || authUser?.accountDisabled) {
          const redirectUrl = new URL('/auth/signin', nextUrl);
          redirectUrl.searchParams.set('error', 'AccountDisabled');
          return Response.redirect(redirectUrl);
        }
        if (
          adminOnlyPrefixes.some((prefix: string) =>
            nextUrl.pathname.startsWith(prefix),
          )
        ) {
          if (!isElevated) {
            const redirectUrl = new URL('/admin', nextUrl);
            redirectUrl.searchParams.set('denied', '1');
            return Response.redirect(redirectUrl);
          }
          return true;
        }

        const requiredPermissions = resolveRequiredPermissions(
          nextUrl.pathname,
        );
        if (requiredPermissions.length === 0) return true;
        const permissions =
          (auth?.user as { permissions?: string[] })?.permissions ?? [];
        const hasAccess =
          isElevated ||
          requiredPermissions.some((permission: string) =>
            permissions.includes(permission),
          );
        if (hasAccess) return true;
        const redirectUrl = new URL('/admin', nextUrl);
        redirectUrl.searchParams.set('denied', '1');
        return Response.redirect(redirectUrl);
      }
      return true;
    },
    session({ session, token }: { session: Session; token: JWT }): Session {
      if (session.user) {
        const user = session.user as any;
        if (token.sub) {
          user.id = token.sub;
        }
        user.role = (token as { role?: string }).role ?? null;
        user.permissions =
          (token as { permissions?: string[] }).permissions ?? [];
        user.roleLevel =
          (token as { roleLevel?: number }).roleLevel ?? null;
        user.isElevated =
          (token as { isElevated?: boolean }).isElevated ?? false;
        user.accountDisabled =
          (token as { accountDisabled?: boolean }).accountDisabled ?? false;
        user.accountBanned =
          (token as { accountBanned?: boolean }).accountBanned ?? false;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
